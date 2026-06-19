export const validateEmail = (email: string): string => {
  if (!email || email.trim() === '') {
    return 'El email es obligatorio';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return 'El email no tiene un formato válido';
  }

  return '';
};

export const validateName = (name: string): string => {
  if (!name || name.trim() === '') {
    return 'El nombre es obligatorio';
  }

  if (name.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres';
  }

  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  
  if (!nameRegex.test(name)) {
    return 'El nombre solo puede contener letras';
  }

  return ''; // Sin errores
};

/**
 * Validación de contraseña
 * Mínimo 8 caracteres
 */
export const validatePassword = (password: string): string => {
  if (!password || password.trim() === '') {
    return 'La contraseña es obligatoria';
  }

  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  return ''; // Sin errores
};

/**
 * Validación de confirmación de contraseña
 */
export const validatePasswordMatch = (password: string, confirmPassword: string): string => {
  if (password !== confirmPassword) {
    return 'Las contraseñas no coinciden';
  }

  return '';
};