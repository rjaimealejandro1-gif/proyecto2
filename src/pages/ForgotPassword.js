import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const ForgotPassword = () => {
  const { resetPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);

    const { error: resetError } = await resetPassword(email);
    
    // Simulación para propósitos de demo si no hay SMTP configurado
    if (resetError) {
      console.warn('Supabase Reset Error (expected if SMTP not configured):', resetError.message);
      setSuccess(`Simulación: Enlace de recuperación "enviado" a ${email}. (Nota: Como no hay un servidor de correo real configurado, puedes cambiar tu contraseña directamente en el panel de Supabase).`);
      setEmail('');
      setLoading(false);
      return;
    }

    setSuccess('Se ha enviado un enlace de recuperación a tu correo electrónico.');
    setEmail('');
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-top-bar">
        <button className="auth-back-btn" onClick={() => navigate('/login')} title="Volver a iniciar sesión">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          <span>Sesión</span>
        </button>
        <label className="theme-switch auth-theme-switch" title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
          <input type="checkbox" className="input" checked={theme === 'dark'} onChange={toggleTheme} />
          <span className="theme-slider"></span>
          <span className="theme-sun">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
          </span>
          <span className="theme-moon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </span>
        </label>
      </div>

      <div className="auth-card">
        <h2>Recuperar Contraseña</h2>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Volver al inicio de sesión</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
