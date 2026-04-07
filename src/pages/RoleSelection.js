import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AvatarPicker from '../components/AvatarPicker';
import '../styles/RoleSelection.css';

const RoleSelection = () => {
  const { user, role, completeProfile, loading } = useAuth();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix');

  // Redirección si ya tiene rol (para evitar doble registro)
  useEffect(() => {
    if (!loading && role) {
      console.log(`[ROLE SELECT] User already has role: ${role}. Redirecting...`);
      const path = {
        administrador: '/admin/dashboard',
        docente: '/docente/dashboard',
        estudiante: '/estudiante/dashboard'
      }[role];
      if (path) navigate(path, { replace: true });
    }
  }, [role, loading, navigate]);

  const handleRoleSelect = async (roleName) => {
    setSelecting(true);
    setError(null);
    const { error: completeError } = await completeProfile(roleName, avatarUrl);
    
    if (completeError) {
      setError(completeError.message);
      setSelecting(false);
    } else {
      // Navegación automática al dashboard por rol
      const path = roleName === 'docente' ? '/docente/dashboard' : '/estudiante/dashboard';
      navigate(path);
    }
  };

  return (
    <div className="role-selection-wrapper">
      <div className="role-selection-card">
        <div className="role-selection-header">
          <h1>¡Bienvenido a Teseeducativo05!</h1>
          <p>Para configurar tu cuenta, personaliza tu perfil y elige tu rol.</p>
        </div>

        {error && <div className="role-error-message">{error}</div>}

        <div className="role-avatar-section">
          <AvatarPicker 
            selectedAvatar={avatarUrl} 
            onSelect={setAvatarUrl} 
          />
        </div>

        <h3 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
          ¿Cuál será tu función principal?
        </h3>

        <div className="role-options-grid">
          <div 
            className={`role-option student ${selecting ? 'disabled' : ''}`}
            onClick={() => !selecting && handleRoleSelect('estudiante')}
          >
            <div className="role-option-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A57.43 57.43 0 0 0 12 11.75a57.43 57.43 0 0 0 5.25-.425v3.675m-10.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm10.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5" />
              </svg>
            </div>
            <h3>Estudiante</h3>
            <p>Accede a tus cursos, entrega tareas y monitorea tus calificaciones.</p>
            <div className="role-option-footer">Seleccionar rol Estudiante →</div>
          </div>

          <div 
            className={`role-option teacher ${selecting ? 'disabled' : ''}`}
            onClick={() => !selecting && handleRoleSelect('docente')}
          >
            <div className="role-option-icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <h3>Docente</h3>
            <p>Crea contenidos académicos, califica entregas y gestiona el progreso.</p>
            <div className="role-option-footer">Seleccionar rol Docente →</div>
          </div>
        </div>

        {selecting && (
          <div className="role-processing-overlay">
            <div className="role-spinner"></div>
            <p>Configurando tu espacio académico...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleSelection;
