import { Request, Response, NextFunction } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { User } from '../models/User.model';
import { isKeycloakToken, verifyKeycloakToken, resolveKeycloakUser } from './keycloak.middleware';

const getJwtSecret = (): Secret => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno');
  }
  return secret as Secret;
};

interface JwtPayload {
  userId: string;
  role: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token no proporcionado' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // --- Ruta Keycloak: token emitido por el IdP ---
    if (isKeycloakToken(token)) {
      const payload = await verifyKeycloakToken(token);
      req.user = await resolveKeycloakUser(payload);
      next();
      return;
    }

    // --- Ruta JWT propio: lógica original sin modificar ---
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};
