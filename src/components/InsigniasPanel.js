import { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { getUsuarioIdFromUser } from '../utils/userHelpers';

const InsigniasPanel = ({ userId = null }) => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [allInsignias, setAllInsignias] = useState([]);
  const [userInsignias, setUserInsignias] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user, userId]);

  useEffect(() => {
    if (usuarioId) fetchInsignias();
  }, [usuarioId]);

  const fetchInsignias = async () => {
    setLoading(true);
    try {
      const [allRes, userRes] = await Promise.all([
        supabase.from('insignias').select('*').order('tipo'),
        supabase.from('insignias_usuario').select('*, insignias(*)').eq('id_usuario', usuarioId),
      ]);

      setAllInsignias(allRes.data || []);
      setUserInsignias(userRes.data || []);
    } catch (err) {
      console.error('Error fetching insignias:', err);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (insigniaId) => {
    return userInsignias.some(ui => ui.id_insignia === insigniaId);
  };

  const getInsigniaDate = (insigniaId) => {
    const userInsignia = userInsignias.find(ui => ui.id_insignia === insigniaId);
    if (!userInsignia) return null;
    return new Date(userInsignia.fecha_obtenida);
  };

  const unlockedCount = userInsignias.length;
  const totalCount = allInsignias.length;

  const groupedInsignias = allInsignias.reduce((acc, insignia) => {
    if (!acc[insignia.tipo]) acc[insignia.tipo] = [];
    acc[insignia.tipo].push(insignia);
    return acc;
  }, {});

  const tipoLabels = {
    inscripcion: '📚 Inscripciones',
    cuestionario: '📋 Cuestionarios',
    tarea: '📝 Tareas',
    foro: '💬 Participación',
    progreso: '🎯 Progreso',
  };

  if (loading) {
    return <div className="ip-loading">Cargando insignias...</div>;
  }

  return (
    <div className="ip-container">
      <div className="ip-header">
        <h2>Insignias y Logros</h2>
        <div className="ip-counter">
          <span className="ip-unlocked">{unlockedCount}</span>
          <span className="ip-total">/ {totalCount}</span>
        </div>
      </div>

      {unlockedCount > 0 && (
        <div className="ip-progress">
          <div className="ip-progress-bar" style={{ width: `${(unlockedCount / totalCount) * 100}%` }}></div>
        </div>
      )}

      {Object.entries(groupedInsignias).map(([tipo, insignias]) => (
        <div key={tipo} className="ip-group">
          <h3 className="ip-group-title">{tipoLabels[tipo] || tipo}</h3>
          <div className="ip-grid">
            {insignias.map(insignia => {
              const unlocked = isUnlocked(insignia.id_insignia);
              const date = getInsigniaDate(insignia.id_insignia);

              return (
                <div key={insignia.id_insignia} className={`ip-card ${unlocked ? 'ip-unlocked' : 'ip-locked'}`}>
                  <div className="ip-icon">{insignia.icono || '🏅'}</div>
                  <div className="ip-info">
                    <span className="ip-name">{insignia.nombre}</span>
                    <span className="ip-desc">{insignia.descripcion}</span>
                    {unlocked && date && (
                      <span className="ip-date">
                        Obtenida el {date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  {unlocked && <span className="ip-check">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {unlockedCount === 0 && (
        <div className="ip-empty">
          <span className="ip-empty-icon">🏆</span>
          <p>Completa actividades para desbloquear insignias</p>
        </div>
      )}

      <style>{`
        .ip-container { padding: 24px; max-width: 800px; margin: 0 auto; }
        .ip-loading { display: flex; justify-content: center; align-items: center; min-height: 300px; color: var(--text-secondary); }
        .ip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .ip-header h2 { font-size: 24px; color: var(--text-primary); margin: 0; font-family: 'Outfit', sans-serif; }
        .ip-counter { font-size: 20px; }
        .ip-unlocked { font-weight: 700; color: var(--success); }
        .ip-total { color: var(--text-tertiary); font-weight: 500; }
        .ip-progress { height: 6px; background: var(--bg-subtle); border-radius: 8px; margin-bottom: 24px; overflow: hidden; }
        .ip-progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), var(--success)); border-radius: 8px; transition: width 0.5s ease; }
        .ip-group { margin-bottom: 24px; }
        .ip-group-title { font-size: 14px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px 0; font-weight: 600; font-family: 'Outfit', sans-serif; }
        .ip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .ip-card { display: flex; align-items: flex-start; gap: 12px; padding: 14px; background: var(--bg-elevated); border-radius: 10px; border: 1px solid var(--border-default); transition: transform 0.2s, box-shadow 0.2s; box-shadow: var(--shadow-outset-sm); }
        .ip-card.ip-unlocked { border-color: var(--success); background: linear-gradient(135deg, var(--success-subtle), var(--bg-elevated)); }
        .ip-card.ip-unlocked:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(16,185,129,0.15); }
        .ip-card.ip-locked { opacity: 0.5; filter: grayscale(1); }
        .ip-icon { font-size: 28px; flex-shrink: 0; }
        .ip-info { flex: 1; min-width: 0; }
        .ip-name { font-size: 14px; font-weight: 600; color: var(--text-primary); display: block; margin-bottom: 2px; font-family: 'Outfit', sans-serif; }
        .ip-desc { font-size: 12px; color: var(--text-secondary); display: block; line-height: 1.4; }
        .ip-date { font-size: 10px; color: var(--success); display: block; margin-top: 4px; font-weight: 500; }
        .ip-check { color: var(--success); font-size: 18px; font-weight: 700; flex-shrink: 0; }
        .ip-empty { text-align: center; padding: 40px; }
        .ip-empty-icon { font-size: 48px; display: block; margin-bottom: 12px; }
        .ip-empty p { color: var(--text-tertiary); margin: 0; }
        @media (max-width: 768px) {
          .ip-container { padding: 16px; }
          .ip-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default InsigniasPanel;
