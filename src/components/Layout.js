import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const Icon = ({ name, size = 20 }) => {
  const icons = {
    dashboard: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
    users: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    courses: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      </svg>
    ),
    catalog: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    ),
    grades: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    ),
    stats: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    trophies: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </svg>
    ),
    history: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
    logout: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    ),
    close: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </svg>
    ),
    sun: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    ),
    moon: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  };
  return icons[name] || null;
};

const Layout = ({ children }) => {
  const { user, role, avatar, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const getNavLinks = () => {
    switch (role) {
      case 'administrador':
        return [
          { path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { path: '/admin/users', label: 'Gestionar Usuarios', icon: 'users' },
          { path: '/admin/courses', label: 'Gestionar Cursos', icon: 'courses' },
        ];
      case 'docente':
        return [
          { path: '/docente/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { path: '/docente/my-courses', label: 'Mis Cursos', icon: 'courses' },
          { path: '/docente/grades', label: 'Calificaciones', icon: 'grades' },
          { path: '/docente/stats', label: 'Estadisticas', icon: 'stats' },
        ];
      case 'estudiante':
        return [
          { path: '/estudiante/dashboard', label: 'Dashboard', icon: 'dashboard' },
          { path: '/estudiante/catalog', label: 'Catalogo', icon: 'catalog' },
          { path: '/estudiante/my-courses', label: 'Mis Cursos', icon: 'courses' },
          { path: '/estudiante/grades', label: 'Calificaciones', icon: 'grades' },
          { path: '/estudiante/insignias', label: 'Insignias', icon: 'trophies' },
          { path: '/estudiante/history', label: 'Historial', icon: 'history' },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'administrador':
        return 'Admin';
      case 'docente':
        return 'Docente';
      case 'estudiante':
        return 'Estudiante';
      default:
        return '';
    }
  };

  return (
    <div className="layout">
      <div className="layout-bg"></div>
      <div className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}></div>

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/tese.png" alt="Logo TeseEducativo05" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            <span className="sidebar-logo">TeseEducativo05</span>
          </div>
          <span className="sidebar-role-badge">{getRoleLabel()}</span>
          <button className="sidebar-close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`sidebar-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-link-icon">
                <Icon name={link.icon} size={20} />
              </span>
              <span className="sidebar-link-text">{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-button" onClick={handleLogout}>
            <Icon name="logout" size={20} />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span></span>
            <span></span>
            <span></span>
          </button>

          <h1 className="topbar-title">
            <img src="/tese.png" alt="Logo" style={{ width: '24px', height: '24px', marginRight: '10px', verticalAlign: 'middle', borderRadius: '50%' }} />
            Plataforma TeseEducativo05
          </h1>

          <div className="topbar-actions">
            <NotificationBell />
            
            <label className="theme-switch" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              <input type="checkbox" className="input" checked={theme === 'dark'} onChange={toggleTheme} />
              <span className="theme-slider"></span>
              <span className="theme-sun">
                <Icon name="sun" size={24} />
              </span>
              <span className="theme-moon">
                <Icon name="moon" size={24} />
              </span>
            </label>

            {user && (
              <div className="user-menu">
                <img 
                  src={avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                  className="user-avatar" 
                  alt="Avatar"
                />
                <span className="user-name">{user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'}</span>
              </div>
            )}
          </div>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
