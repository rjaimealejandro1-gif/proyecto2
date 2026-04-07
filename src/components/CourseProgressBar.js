import { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { getUsuarioIdFromUser } from '../utils/userHelpers';

const CourseProgressBar = ({ courseId, className = '' }) => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId && courseId) {
      fetchProgress();
    }
  }, [usuarioId, courseId]);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const { data: units } = await supabase
        .from('unidades')
        .select('id_unidad')
        .eq('id_curso', courseId);

      const unitIds = (units || []).map(u => u.id_unidad);

      if (unitIds.length === 0) {
        setProgress(0);
        setDetails({ completed: 0, total: 0 });
        setLoading(false);
        return;
      }

      const [materialsRes, tasksRes, quizzesRes, deliveriesRes, gradesRes] = await Promise.all([
        supabase.from('materiales').select('id_material', { count: 'exact' }).in('id_unidad', unitIds),
        supabase.from('tareas').select('id_tarea', { count: 'exact' }).in('id_unidad', unitIds),
        supabase.from('cuestionarios').select('id_cuestionario', { count: 'exact' }).in('id_unidad', unitIds),
        supabase.from('entregas').select('id_tarea').in('id_tarea', 
          (await supabase.from('tareas').select('id_tarea').in('id_unidad', unitIds)).data?.map(t => t.id_tarea) || []
        ).eq('id_estudiante', usuarioId),
        supabase.from('calificaciones').select('id_calificacion')
          .eq('id_estudiante', usuarioId)
          .eq('id_curso', courseId),
      ]);

      const totalMaterials = materialsRes.count || 0;
      const totalTasks = tasksRes.count || 0;
      const totalQuizzes = quizzesRes.count || 0;
      const totalActivities = totalMaterials + totalTasks + totalQuizzes;

      const completedDeliveries = new Set((deliveriesRes.data || []).map(d => d.id_tarea)).size;
      const completedQuizzes = (gradesRes.data || []).filter(g => g.id_calificacion).length;

      const completed = Math.min(completedDeliveries + completedQuizzes, totalTasks + totalQuizzes);
      const progressPercent = totalActivities > 0
        ? Math.round((completed / totalActivities) * 100)
        : 0;

      setProgress(progressPercent);
      setDetails({ completed, total: totalTasks + totalQuizzes });

      await supabase.from('inscripciones').update({
        progreso_total: progressPercent,
      }).eq('id_estudiante', usuarioId).eq('id_curso', courseId);

    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProgressColor = () => {
    if (progress >= 75) return '#10b981';
    if (progress >= 50) return '#f59e0b';
    if (progress >= 25) return '#6366f1';
    return '#6b7280';
  };

  const getProgressLabel = () => {
    if (progress >= 100) return 'Completado';
    if (progress >= 75) return 'Casi completo';
    if (progress >= 50) return 'En progreso';
    if (progress >= 25) return 'Comenzando';
    return 'Iniciado';
  };

  if (loading) {
    return (
      <div className={`cpb-container ${className}`}>
        <div className="cpb-skeleton"></div>
      </div>
    );
  }

  return (
    <div className={`cpb-container ${className}`}>
      <div className="cpb-header">
        <span className="cpb-label">Progreso del curso</span>
        <span className="cpb-percentage">{progress}%</span>
      </div>
      <div className="cpb-bar-bg">
        <div
          className="cpb-bar-fill"
          style={{
            width: `${progress}%`,
            backgroundColor: getProgressColor(),
          }}
        ></div>
      </div>
      <div className="cpb-footer">
        <span className="cpb-status" style={{ color: getProgressColor() }}>
          {getProgressLabel()}
        </span>
        {details.total > 0 && (
          <span className="cpb-details">
            {details.completed}/{details.total} actividades completadas
          </span>
        )}
      </div>

      <style>{`
        .cpb-container {
          padding: 16px;
          background: var(--bg-elevated);
          border-radius: 12px;
          border: 1px solid var(--border-default);
          box-shadow: var(--shadow-outset-sm);
        }
        .cpb-skeleton {
          height: 60px;
          background: linear-gradient(90deg, var(--bg-subtle) 25%, var(--border-default) 50%, var(--bg-subtle) 75%);
          background-size: 200% 100%;
          animation: cpb-shimmer 1.5s infinite;
          border-radius: 10px;
        }
        @keyframes cpb-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .cpb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .cpb-label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .cpb-percentage {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Outfit', sans-serif;
        }
        .cpb-bar-bg {
          height: 10px;
          background: var(--bg-subtle);
          border-radius: 8px;
          overflow: hidden;
        }
        .cpb-bar-fill {
          height: 100%;
          border-radius: 8px;
          transition: width 0.5s ease, background-color 0.3s ease;
        }
        .cpb-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }
        .cpb-status {
          font-size: 12px;
          font-weight: 600;
        }
        .cpb-details {
          font-size: 11px;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
};

export default CourseProgressBar;
