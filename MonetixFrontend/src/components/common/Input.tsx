// src/components/common/Input.tsx

import React, { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <input className={`form-input ${error ? 'error' : ''} ${className}`} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default Input;