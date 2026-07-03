import { Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { User } from '../models/User.model';
import { Types } from 'mongoose';

const getJwtSecret = (): Secret => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno');
  }
  return secret as Secret;
};

export const login = async (request: Request, response: Response): Promise<void> => {
  try {
    const { email, password } = request.body;

    const user = await User.findOne({ email });

    if (!user) {
      response.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      response.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: (user._id as Types.ObjectId).toString(),
        role: user.role
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    response.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: {
        token,
        user: {
          id: (user._id as Types.ObjectId).toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Error en login:', error);
    response.status(500).json({
      success: false,
      message: 'Error al iniciar sesión',
    });
  }
};

export const register = async (request: Request, response: Response): Promise<void> => {
  try {
    const { email, password, name, role } = request.body;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      response.status(400).json({
        success: false,
        message: 'El email ya está registrado',
      });
      return;
    }

    const user = new User({
      email,
      password,
      name,
      role: role || 'user',
    });

    await user.save();

    const token = jwt.sign(
      {
        userId: (user._id as Types.ObjectId).toString(),
        role: user.role
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    response.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: {
        token,
        user: {
          id: (user._id as Types.ObjectId).toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Error en registro:', error);
    response.status(500).json({
      success: false,
      message: 'Error al registrar usuario',
    });
  }
};

/**
 * Register user directly in Keycloak — assigns realm role "monetix-user" (Monetix-only access)
 */
export const registerKeycloak = async (request: Request, response: Response): Promise<void> => {
  try {
    const { email, password, name } = request.body as { email?: string; password?: string; name?: string };

    if (!email || !password) {
      response.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
      return;
    }
    if (password.length < 8) {
      response.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    const issuer = process.env.KEYCLOAK_ISSUER || 'http://keycloak:8080/realms/universidad';
    const kcBase = issuer.replace(/\/realms\/[^/]+$/, '');
    const realm = 'universidad';

    // 1. Admin token
    const tokenRes = await fetch(`${kcBase}/realms/master/protocol/openid-connect/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'admin-cli',
        grant_type: 'password',
        username: process.env.KEYCLOAK_ADMIN ?? 'admin',
        password: process.env.KEYCLOAK_ADMIN_PASSWORD ?? '',
      }),
    });
    if (!tokenRes.ok) throw new Error('No se pudo autenticar con el administrador de Keycloak');
    const { access_token } = await tokenRes.json() as { access_token: string };

    // 2. Create user
    const [firstName = '', ...rest] = (name ?? '').split(' ');
    const lastName = rest.join(' ');
    const createRes = await fetch(`${kcBase}/admin/realms/${realm}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: email.split('@')[0],
        email,
        firstName,
        lastName,
        enabled: true,
        emailVerified: true,
        credentials: [{ type: 'password', value: password, temporary: false }],
      }),
    });

    if (createRes.status === 409) {
      response.status(409).json({ success: false, message: 'El email ya está registrado en Keycloak' });
      return;
    }
    if (!createRes.ok) {
      const body = await createRes.text();
      throw new Error(`Keycloak rechazó la creación: ${body}`);
    }

    const userId = createRes.headers.get('location')?.split('/').pop();
    if (!userId) throw new Error('Keycloak no devolvió el ID del usuario creado');

    // 3. Assign realm role "monetix-user" — scope limitado a Monetix
    const roleRes = await fetch(`${kcBase}/admin/realms/${realm}/roles/monetix-user`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!roleRes.ok) throw new Error('No se encontró el rol "monetix-user" en Keycloak');
    const monetixRole = await roleRes.json() as { id: string; name: string };

    await fetch(`${kcBase}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id: monetixRole.id, name: monetixRole.name }]),
    });

    response.status(201).json({
      success: true,
      message: 'Cuenta creada en Keycloak. Usa "Iniciar sesión con SSO" para entrar.',
      data: { email, username: email.split('@')[0], role: 'monetix-user' },
    });
  } catch (error) {
    console.error('Error en registerKeycloak:', error);
    response.status(500).json({ success: false, message: 'Error al crear cuenta en Keycloak' });
  }
};

export const getCurrentUser = async (request: Request, response: Response): Promise<void> => {
  try {
    const user = request.user;

    if (!user) {
      response.status(401).json({
        success: false,
        message: 'Usuario no autenticado',
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: {
        user: {
          id: (user._id as Types.ObjectId).toString(),
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    response.status(500).json({
      success: false,
      message: 'Error al obtener usuario',
    });
  }
};