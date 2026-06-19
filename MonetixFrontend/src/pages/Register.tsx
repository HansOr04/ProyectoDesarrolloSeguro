// src/pages/Register.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/auth.service';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { validateEmail, validatePassword, validateName } from '@/utils/validators';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Estados del formulario
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  
  // Estados de errores
  const [errors, setErrors] = useState({
    name: '',
    email: '',
    password: ''
  });
  
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Validar campos individuales
  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'name':
        error = validateName(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Manejar cambios en inputs
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error al escribir
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    if (apiError) {
      setApiError('');
    }
  };

  // Validar al perder foco
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    validateField(name, value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos los campos
    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);

    setErrors({
      name: nameErr,
      email: emailErr,
      password: passwordErr
    });

    // Si hay errores, no continuar
    if (nameErr || emailErr || passwordErr) {
      return;
    }

    setApiError('');
    setLoading(true);

    try {
      // Registrar
      await authService.register({
        ...formData,
        role: 'user'
      });

      // Auto-login después del registro
      await login({
        email: formData.email,
        password: formData.password
      });

      navigate('/');
    } catch (err: any) {
      setApiError(err.response?.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <img
            src="/piggy-bank.png"
            alt="Monetix"
            className="auth-logo__image"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="auth-logo__title">MONETIX</h1>
        </div>

        <div className="auth-card">
          <div className="auth-card__header">
            <h2 className="auth-card__title">REGISTRO</h2>
            <p className="auth-card__subtitle">USUARIO</p>
          </div>

          <div className="auth-card__body">
            <form onSubmit={handleSubmit} className="form" noValidate>
              {apiError && (
                <div
                  style={{
                    padding: 'var(--spacing-md)',
                    backgroundColor: 'rgba(216, 124, 124, 0.1)',
                    borderRadius: 'var(--border-radius-md)',
                    color: 'var(--color-error)',
                    textAlign: 'center'
                  }}
                >
                  {apiError}
                </div>
              )}

              <Input
                type="text"
                name="name"
                label="NOMBRE"
                placeholder="Tu nombre completo"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.name}
              />

              <Input
                type="email"
                name="email"
                label="EMAIL"
                placeholder="usuario@ejemplo.com"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email}
              />

              <Input
                type="password"
                name="password"
                label="PASSWORD"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
              />

              <Button type="submit" fullWidth disabled={loading}>
                {loading ? 'CREANDO CUENTA...' : 'CREAR'}
              </Button>
            </form>

            <div className="auth-footer">
              <Link to="/login" className="form-link">
                Regresar
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;