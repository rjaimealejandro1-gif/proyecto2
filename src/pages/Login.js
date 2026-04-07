import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../supabaseClient';

const Login = () => {
  const { signIn, signInWithGoogle, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Observador proactivo de rol para redirigir una vez que la base de datos responda
  useEffect(() => {
    if (role) {
      if (role === 'administrador') navigate('/admin/dashboard');
      else if (role === 'docente') navigate('/docente/dashboard');
      else if (role === 'estudiante') navigate('/estudiante/dashboard');
    }
  }, [role, navigate]);

  const handleAdminLogin = async (adminId, adminPassword) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*, roles!inner(nombre_rol)')
      .eq('numero_identificacion', adminId)
      .eq('contraseña_hash', adminPassword)
      .eq('roles.nombre_rol', 'administrador')
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    localStorage.setItem('admin_session', JSON.stringify({
      id: data.id_usuario,
      numero_identificacion: data.numero_identificacion,
      nombre: data.nombre,
      rol: 'administrador',
      email: data.email
    }));

    return true;
  };

  const handleGoogleLogin = async () => {
    setError('');
    const { error } = await signInWithGoogle();
    if (error) {
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!email || !password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    if (email === 'Teseeducativo05' && password === 'tese202320483') {
      const adminSuccess = await handleAdminLogin('Teseeducativo05', 'tese202320483');
      if (adminSuccess) {
        setSuccess('Inicio de sesion exitoso como Administrador');
        setTimeout(() => {
          // Usamos window.location para forzar recarga del AuthContext con el nuevo LocalStorage
          window.location.href = '/admin/dashboard';
        }, 300);
        return;
      }
    }

    const { error: signInError } = await signIn({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    setSuccess('Inicio de sesion exitoso');
    // La redirección ahora está protegida y manejada automáticamente por el useEffect observando 'role'
  };

  return (
    <div className="auth-page">
      <div className="auth-top-bar">
        <button className="auth-back-btn" onClick={() => navigate('/')} title="Volver a la portada">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/>
            <path d="M12 19l-7-7 7-7"/>
          </svg>
          <span>Portada</span>
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
        <div className="auth-logo">
          <span className="auth-logo-text">Teseeducativo05</span>
        </div>
        
        <h2>Iniciar Sesion</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Correo electronico o ID de Administrador</label>
            <input
              type="text"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              autoComplete="username"
              className="form-input"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Contrasena</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contrasena"
              required
              autoComplete="current-password"
              className="form-input"
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
            {loading ? 'Iniciando sesion...' : 'Iniciar Sesion'}
          </button>
        </form>

        <div className="divider">o</div>

        <div className="oauth-container">
          <button 
            type="button" 
            className="btn-oauth" 
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continuar con Google
          </button>
        </div>
        
        <div className="auth-links">
          <Link to="/forgot-password">¿Olvidaste tu contrasena?</Link>
          <span>¿No tienes cuenta? <Link to="/register">Registrate aqui</Link></span>
        </div>
      </div>
    </div>
  );
};

export default Login;
