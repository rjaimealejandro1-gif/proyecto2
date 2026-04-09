import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import AvatarPicker from '../components/AvatarPicker';
import '../styles/RegisterToast.css';

const Register = () => {
  const { signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('estudiante');
  const [avatarUrl, setAvatarUrl] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'); // Default selection
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!nombre || !email || !password || !confirmPassword) {
      setError('Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    const { data: signData, error: signUpError } = await signUp({
      nombre,
      email,
      password,
      role,
      avatarUrl
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (signData?.session) {
      setLoading(false);
      window.location.replace('/');
      return;
    }

    setSuccess('Registro exitoso. Revisa tu correo para confirmar tu cuenta.');
    setNombre('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('estudiante');
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

      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-logo">
          <span className="logo-text">Teseeducativo05</span>
        </div>
        
        {!success && (
          <>
            <h2>Crear Cuenta</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Únete a nuestra plataforma académica profesional.
            </p>
          </>
        )}
        
        {error && <div className="error-message">{error}</div>}
        
        {success ? (
          <div className="toast-card">
            <div className="toast-container">
              <div className="toast-status-ind"></div>
              <div className="toast-right">
                <div className="toast-text-wrap">
                  <span className="toast-time">Confirmación de Registro</span>
                  <p className="toast-text-link">¡Cuenta pre-creada! Por favor, revisa tu bandeja de entrada o carpeta de Spam y haz clic en el botón de confirmación.</p>
                </div>
                <div className="toast-button-wrap">
                  <button type="button" className="toast-primary-cta" onClick={() => setSuccess('')}>
                    OK
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Tu nombre"
              required
              autoComplete="name"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Correo electronico</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoComplete="email"
              className="form-input"
            />
          </div>

          <AvatarPicker 
            selectedAvatar={avatarUrl} 
            onSelect={setAvatarUrl} 
          />
          
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Contrasena</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6"
                required
                autoComplete="new-password"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirmar</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite"
                required
                autoComplete="new-password"
                className="form-input"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="role">¿Qué rol tendrás?</label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="form-input form-select"
            >
              <option value="estudiante">Estudiante - Quiero aprender</option>
              <option value="docente">Docente - Quiero enseñar</option>
            </select>
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px', height: '48px' }}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </button>
        </form>
        )}
        
        {!success && (
          <div className="auth-links">
            <span>¿Ya tienes cuenta? <Link to="/login">Inicia sesion aqui</Link></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
