// src/components/common/Badge.tsx

import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className = '',
}) => {
  const classes = ['badge', `badge-${variant}`, className].filter(Boolean).join(' ');

  return <span className={classes}>{children}</span>;
};

export default Badge;
