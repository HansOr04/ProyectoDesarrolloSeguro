// src/components/layout/Header.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export const Header: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Cerrar menú móvil al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevenir scroll cuando el menú móvil está abierto
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const navLinks = [
    { path: '/', label: 'Inicio', icon: '🏠' },
    { path: '/transactions', label: 'Transacciones', icon: '💰' },
    { path: '/categories', label: 'Categorías', icon: '📁' },
    { path: '/predictions', label: 'Predicciones', icon: '📊' },
    { path: '/comparisons', label: 'Comparativas', icon: '📈' },
    { path: '/goals', label: 'Mis Metas', icon: '🎯' },
    { path: '/alerts', label: 'Alertas', icon: '🔔' },
  ];

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <header className="header">
        <div className="header__container">
          <div className="header__left">
            <Link to="/" className="header__logo">
              <img
                src="/logo-monetix.png"
                alt="Monetix"
                className="header__logo-image"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </Link>

            <nav className="header__nav">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`header__nav-link ${isActive(link.path)}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="header__right">
            {/* Hamburger Menu Button */}
            <button
              className={`header__menu-toggle ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>

            <div className="header__user" ref={dropdownRef}>
              <button
                className="header__user-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="header__user-icon">{user?.name ? getInitials(user.name) : 'U'}</div>
                <span className="header__user-name">
                  Hi, {user?.name ? user.name.split(' ')[0] : 'Usuario'}!
                </span>
              </button>

              <div className={`header__dropdown ${dropdownOpen ? 'active' : ''}`}>
                {user?.role === 'admin' && (
                  <>
                    <Link
                      to="/admin/users"
                      className="header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      👥 Gestionar Usuarios
                    </Link>
                    <Link
                      to="/admin/config"
                      className="header__dropdown-item"
                      onClick={() => setDropdownOpen(false)}
                    >
                      ⚙️ Configuración
                    </Link>
                    <div
                      style={{
                        borderTop: '2px solid var(--color-border)',
                        margin: 'var(--spacing-sm) 0'
                      }}
                    />
                  </>
                )}
                <Link
                  to="/profile"
                  className="header__dropdown-item"
                  onClick={() => setDropdownOpen(false)}
                >
                  👤 Mi Perfil
                </Link>
                <button className="header__dropdown-item danger" onClick={handleLogout}>
                  🚪 Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Overlay */}
      <div
        className={`header__mobile-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Navigation Drawer */}
      <nav className={`header__mobile-nav ${mobileMenuOpen ? 'active' : ''}`}>
        <div className="header__mobile-nav-header">
          <span className="header__mobile-nav-title">Navegación</span>
        </div>
        <div className="header__mobile-nav-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`header__mobile-nav-link ${isActive(link.path)}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="header__mobile-nav-link-icon">{link.icon}</span>
              {link.label}
            </Link>
          ))}
          {user?.role === 'admin' && (
            <>
              <div style={{ borderTop: '1px solid var(--color-border)', margin: 'var(--spacing-md) 0' }} />
              <Link
                to="/admin/users"
                className={`header__mobile-nav-link ${isActive('/admin/users')}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="header__mobile-nav-link-icon">👥</span>
                Gestionar Usuarios
              </Link>
            </>
          )}
        </div>
      </nav>
    </>
  );
};

export default Header;
