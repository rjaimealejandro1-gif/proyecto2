import { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { getUsuarioIdFromUser } from '../utils/userHelpers';

const ActivityHistory = ({ limit = 20 }) => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId) fetchActivities();
  }, [usuarioId, filter]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('historial_actividad')
        .select('*')
        .eq('id_usuario', usuarioId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filter !== 'all') {
        query = query.eq('tipo', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (tipo) => {
    const icons = {
      inscripcion: '📚',
      tarea_entregada: '📝',
      tarea_calificada: '✅',
      cuestionario: '📋',
      mensaje_foro: '💬',
      curso_creado: '🎓',
      inicio_sesion: '🔐',
      default: '📌',
    };
    return icons[tipo] || icons.default;
  };

  const getActivityColor = (tipo) => {
    const colors = {
      inscripcion: '#6366f1',
      tarea_entregada: '#f59e0b',
      tarea_calificada: '#10b981',
      cuestionario: '#ec4899',
      mensaje_foro: '#06b6d4',
      curso_creado: '#8b5cf6',
      inicio_sesion: '#6b7280',
    };
    return colors[tipo] || '#6b7280';
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const groupActivitiesByDate = () => {
    const groups = {};
    activities.forEach(activity => {
      const date = new Date(activity.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
      if (!groups[date]) groups[date] = [];
      groups[date].push(activity);
    });
    return groups;
  };

  const activityTypes = [
    { value: 'all', label: 'Todas' },
    { value: 'inscripcion', label: 'Inscripciones' },
    { value: 'tarea_entregada', label: 'Tareas' },
    { value: 'cuestionario', label: 'Cuestionarios' },
    { value: 'mensaje_foro', label: 'Foro' },
  ];

  if (loading) {
    return <div className="ah-loading">Cargando historial...</div>;
  }

  const grouped = groupActivitiesByDate();

  return (
    <div className="ah-container">
      <div className="ah-header">
        <h3>Historial de Actividad</h3>
        <div className="ah-filters">
          {activityTypes.map(type => (
            <button
              key={type.value}
              className={`ah-filter-btn ${filter === type.value ? 'ah-active' : ''}`}
              onClick={() => setFilter(type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="ah-empty">
          <span className="ah-empty-icon">📋</span>
          <p>No hay actividad registrada</p>
        </div>
      ) : (
        <div className="ah-timeline">
          {Object.entries(grouped).map(([date, dayActivities]) => (
            <div key={date} className="ah-day-group">
              <div className="ah-day-label">{date}</div>
              <div className="ah-activities">
                {dayActivities.map(activity => (
                  <div key={activity.id_actividad} className="ah-item">
                    <div
                      className="ah-icon"
                      style={{ backgroundColor: `${getActivityColor(activity.tipo)}20`, color: getActivityColor(activity.tipo) }}
                    >
                      {getActivityIcon(activity.tipo)}
                    </div>
                    <div className="ah-content">
                      <span className="ah-description">{activity.descripcion}</span>
                      <span className="ah-time">{formatDate(activity.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .ah-container { padding: 24px; max-width: 800px; margin: 0 auto; }
        .ah-loading { display: flex; justify-content: center; align-items: center; min-height: 300px; color: var(--text-secondary); }
        .ah-header { margin-bottom: 24px; }
        .ah-header h3 { font-size: 20px; color: var(--text-primary); margin: 0 0 16px 0; font-family: 'Outfit', sans-serif; }
        .ah-filters { display: flex; gap: 8px; flex-wrap: wrap; }
        .ah-filter-btn { background: var(--bg-subtle); border: none; padding: 6px 14px; border-radius: 20px; font-size: 12px; cursor: pointer; color: var(--text-secondary); font-weight: 500; transition: all 0.2s; }
        .ah-filter-btn:hover { background: var(--border-default); }
        .ah-filter-btn.ah-active { background: var(--accent); color: var(--bg-elevated); }
        .ah-empty { text-align: center; padding: 40px; }
        .ah-empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }
        .ah-empty p { color: var(--text-tertiary); margin: 0; }
        .ah-timeline { display: flex; flex-direction: column; gap: 24px; }
        .ah-day-group {}
        .ah-day-label { font-size: 12px; font-weight: 600; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--bg-subtle); }
        .ah-activities { display: flex; flex-direction: column; gap: 12px; }
        .ah-item { display: flex; align-items: flex-start; gap: 12px; }
        .ah-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .ah-content { flex: 1; padding-top: 4px; }
        .ah-description { font-size: 14px; color: var(--text-primary); display: block; line-height: 1.4; }
        .ah-time { font-size: 11px; color: var(--text-tertiary); display: block; margin-top: 2px; }
        @media (max-width: 768px) {
          .ah-container { padding: 16px; }
        }
      `}</style>
    </div>
  );
};

export default ActivityHistory;
