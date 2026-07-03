// src/pages/Register.tsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import authService from '@/services/auth.service';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { validateEmail, validatePassword, validateName } from '@/utils/validators';

type Mode = 'local' | 'sso';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [mode, setMode] = useState<Mode>('local');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({ name: '', email: '', password: '' });
  const [apiError, setApiError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m);
    setApiError('');
    setSuccessMsg('');
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    if (field === 'name') error = validateName(value);
    else if (field === 'email') error = validateEmail(value);
    else if (field === 'password') error = validatePassword(value);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (apiError) setApiError('');
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    validateField(e.target.name, e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameErr = validateName(formData.name);
    const emailErr = validateEmail(formData.email);
    const passwordErr = validatePassword(formData.password);
    setErrors({ name: nameErr, email: emailErr, password: passwordErr });
    if (nameErr || emailErr || passwordErr) return;

    setApiError('');
    setLoading(true);

    try {
      if (mode === 'sso') {
        await authService.registerKeycloak({ email: formData.email, password: formData.password, name: formData.name });
        setSuccessMsg('Cuenta SSO creada. Usa el botón "Iniciar con SSO" en el login para entrar.');
      } else {
        await authService.register({ ...formData, role: 'user' });
        await login({ email: formData.email, password: formData.password });
        navigate('/');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al registrarse';
      setApiError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? msg);
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
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          <h1 className="auth-logo__title">MONETIX</h1>
        </div>

        <div className="auth-card">
          <div className="auth-card__header">
            <h2 className="auth-card__title">REGISTRO</h2>
            <p className="auth-card__subtitle">USUARIO</p>
          </div>

          <div className="auth-card__body">
            {/* Selector de tipo de cuenta */}
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginBottom: '8px' }}>
                ¿Cómo quieres crear tu cuenta?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {(['local', 'sso'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    style={{
                      padding: '10px 8px',
                      borderRadius: 'var(--border-radius-md)',
                      border: `2px solid ${mode === m ? 'var(--color-primary)' : 'var(--color-border, #e5e7eb)'}`,
                      background: mode === m ? 'rgba(var(--color-primary-rgb, 79,70,229), 0.06)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: mode === m ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    }}
                  >
                    <div>{m === 'local' ? 'CUENTA LOCAL' : 'CUENTA SSO'}</div>
                    <div style={{ fontWeight: 400, marginTop: '2px', opacity: 0.75 }}>
                      {m === 'local' ? 'Solo Monetix' : 'Acceso institucional'}
                    </div>
                  </button>
                ))}
              </div>
              {mode === 'sso' && (
                <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', textAlign: 'center', marginTop: '6px' }}>
                  Tu cuenta se crea en Keycloak (Universidad). Inicia sesión con SSO.
                </p>
              )}
            </div>

            {successMsg ? (
              <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 'var(--border-radius-md)', color: '#166534', textAlign: 'center', fontSize: '0.85rem' }}>
                {successMsg}
                <div style={{ marginTop: '12px' }}>
                  <Link to="/login" className="form-link">Ir al login</Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="form" noValidate>
                {apiError && (
                  <div style={{ padding: 'var(--spacing-md)', backgroundColor: 'rgba(216,124,124,0.1)', borderRadius: 'var(--border-radius-md)', color: 'var(--color-error)', textAlign: 'center' }}>
                    {apiError}
                  </div>
                )}

                <Input type="text" name="name" label="NOMBRE" placeholder="Tu nombre completo"
                  value={formData.name} onChange={handleChange} onBlur={handleBlur} error={errors.name} />

                <Input type="email" name="email" label="EMAIL" placeholder="usuario@ejemplo.com"
                  value={formData.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} />

                <Input type="password" name="password" label="PASSWORD" placeholder="••••••••"
                  value={formData.password} onChange={handleChange} onBlur={handleBlur} error={errors.password} />

                <Button type="submit" fullWidth disabled={loading}>
                  {loading ? 'CREANDO...' : mode === 'sso' ? 'CREAR CUENTA SSO' : 'CREAR'}
                </Button>
              </form>
            )}

            <div className="auth-footer">
              <Link to="/login" className="form-link">Regresar</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
