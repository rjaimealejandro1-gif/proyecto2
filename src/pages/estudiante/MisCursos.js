import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const MisCursos = () => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId) fetchEnrolledCourses();
  }, [usuarioId]);

  const fetchEnrolledCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: enrollments, error: enrollError } = await supabase
        .from('inscripciones')
        .select('id_curso, fecha_inscripcion, cursos(id_curso, nombre_curso, descripcion, imagen_url, categoria, estado, id_docente)')
        .eq('id_estudiante', usuarioId)
        .order('fecha_inscripcion', { ascending: false });

      if (enrollError) throw enrollError;

      const enrolledCourses = (enrollments || [])
        .filter((e) => e.cursos)
        .map((e) => ({
          id_curso: e.cursos.id_curso,
          nombre_curso: e.cursos.nombre_curso,
          descripcion: e.cursos.descripcion,
          imagen_url: e.cursos.imagen_url,
          categoria: e.cursos.categoria,
          estado: e.cursos.estado,
          id_docente: e.cursos.id_docente,
          fecha_inscripcion: e.fecha_inscripcion,
        }));

      setCourses(enrolledCourses);

      if (enrolledCourses.length > 0) {
        const courseIds = enrolledCourses.map((c) => c.id_curso);
        const teacherIds = enrolledCourses.map((c) => c.id_docente).filter(Boolean);

        let teachers = [];
        if (teacherIds.length > 0) {
          const { data: teachersData, error: teachersError } = await supabase
            .from('usuarios')
            .select('id_usuario, nombre')
            .in('id_usuario', teacherIds);
          if (!teachersError) teachers = teachersData || [];
        }

        const teacherMap = {};
        teachers.forEach((t) => { teacherMap[t.id_usuario] = t.nombre; });

        const progressData = {};

        for (const course of enrolledCourses) {
          const { data: units, error: unitsError } = await supabase
            .from('unidades')
            .select('id_unidad')
            .eq('id_curso', course.id_curso);

          if (unitsError || !units || units.length === 0) {
            progressData[course.id_curso] = { completed: 0, total: 0, percentage: 0, teacherName: teacherMap[course.id_docente] || 'Docente' };
            continue;
          }

          const unitIds = units.map((u) => u.id_unidad);

          let tasks = [];
          if (unitIds.length > 0) {
            const { data: tasksData, error: tasksError } = await supabase
              .from('tareas')
              .select('id_tarea')
              .in('id_unidad', unitIds);
            if (!tasksError) tasks = tasksData || [];
          }

          if (!tasks || tasks.length === 0) {
            progressData[course.id_curso] = { completed: 0, total: 0, percentage: 0, teacherName: teacherMap[course.id_docente] || 'Docente' };
            continue;
          }

          const totalTasks = tasks.length;
          const taskIds = tasks.map((t) => t.id_tarea);

          let deliveries = [];
          if (taskIds.length > 0) {
            const { data: deliveriesData, error: deliveriesError } = await supabase
              .from('entregas')
              .select('id_entrega, calificacion')
              .in('id_tarea', taskIds)
              .eq('id_estudiante', usuarioId);
            if (!deliveriesError) deliveries = deliveriesData || [];
          }

          let completedTasks = 0;
          if (deliveries) {
            completedTasks = deliveries.filter((d) => d.calificacion !== null).length;
          }

          const percentage = totalTasks > 0 ? parseFloat(((completedTasks / totalTasks) * 100).toFixed(0)) : 0;

          progressData[course.id_curso] = {
            completed: completedTasks,
            total: totalTasks,
            percentage,
            teacherName: teacherMap[course.id_docente] || 'Docente',
          };
        }

        setProgress(progressData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="mis-cursos-loading">Cargando mis cursos...</div>;
  }

  return (
    <div className="mis-cursos">
      <div className="mis-cursos-header">
        <div>
          <h1>Mis Cursos</h1>
          <p>Cursos en los que estás inscrito</p>
        </div>
        <Link to="/estudiante/catalog" className="mis-cursos-btn-catalog">
          Explorar catálogo
        </Link>
      </div>

      {error && <div className="mis-cursos-error">{error}</div>}

      {courses.length === 0 ? (
        <div className="mis-cursos-empty">
          <p>No estás inscrito en ningún curso aún</p>
          <Link to="/estudiante/catalog" className="mis-cursos-btn-primary">
            Explorar catálogo de cursos
          </Link>
        </div>
      ) : (
        <div className="mis-cursos-grid">
          {courses.map((c) => {
            const courseProgress = progress[c.id_curso] || { completed: 0, total: 0, percentage: 0, teacherName: 'Docente' };
            return (
              <Link
                key={c.id_curso}
                to={`/course/${c.id_curso}`}
                className="mis-curso-card"
              >
                <div className="mis-curso-card-image">
                  {c.imagen_url ? (
                    <img
                      src={c.imagen_url}
                      alt={c.nombre_curso}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div
                    className="mis-curso-card-image-placeholder"
                    style={{ display: c.imagen_url ? 'none' : 'flex' }}
                  >
                    &#128218;
                  </div>
                </div>
                <div className="mis-curso-card-body">
                  <div className="mis-curso-card-badges">
                    <span className={`mis-curso-badge ${c.estado === 'activo' ? 'mis-curso-badge-active' : 'mis-curso-badge-inactive'}`}>
                      {c.estado}
                    </span>
                    <span className="mis-curso-category">{c.categoria}</span>
                  </div>
                  <h3>{c.nombre_curso}</h3>
                  <p className="mis-curso-desc">{c.descripcion}</p>
                  <div className="mis-curso-teacher">
                    <span className="mis-curso-teacher-label">Docente: </span>
                    <span className="mis-curso-teacher-name">{courseProgress.teacherName}</span>
                    <br />
                    <span className="mis-curso-teacher-label">Inscrito: </span>
                    <span className="mis-curso-teacher-name">{new Date(c.fecha_inscripcion).toLocaleDateString('es-ES')}</span>
                  </div>
                  <div className="mis-curso-progress">
                    <div className="mis-curso-progress-header">
                      <span className="mis-curso-progress-label">Progreso</span>
                      <span className="mis-curso-progress-percentage">{courseProgress.percentage}%</span>
                    </div>
                    <div className="mis-curso-progress-bar">
                      <div
                        className="mis-curso-progress-fill"
                        style={{ width: `${courseProgress.percentage}%` }}
                      ></div>
                    </div>
                    <span className="mis-curso-progress-detail">
                      {courseProgress.completed} de {courseProgress.total} tareas completadas
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <style>{`
        .mis-cursos {
          padding: 0;
          max-width: 100%;
        }
        .mis-cursos-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 16px;
          color: var(--text-tertiary);
        }
        .mis-cursos-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 28px;
        }
        .mis-cursos-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(1.5rem, 2.5vw, 2rem);
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px 0;
          letter-spacing: -0.4px;
        }
        .mis-cursos-header p {
          color: var(--text-secondary);
          margin: 0;
          font-size: 0.9rem;
        }
        .mis-cursos-btn-catalog {
          background: var(--gradient-accent);
          color: #fff;
          border: none;
          padding: 10px 22px;
          border-radius: 12px;
          font-size: 0.825rem;
          cursor: pointer;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 14px rgba(91, 141, 239, 0.2);
        }
        .mis-cursos-btn-catalog:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(91, 141, 239, 0.3);
        }
        .mis-cursos-error {
          background: var(--danger-subtle);
          border: 1px solid rgba(212, 107, 107, 0.15);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 0.825rem;
        }
        .mis-cursos-empty {
          text-align: center;
          padding: 60px 20px;
          background: var(--bg-surface);
          border-radius: 20px;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-outset-sm);
        }
        .mis-cursos-empty p {
          color: var(--text-tertiary);
          font-size: 0.95rem;
          margin-bottom: 16px;
        }
        .mis-cursos-btn-primary {
          display: inline-block;
          background: var(--gradient-accent);
          color: #fff;
          padding: 12px 24px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 0.825rem;
          font-weight: 600;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 14px rgba(91, 141, 239, 0.2);
        }
        .mis-cursos-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(91, 141, 239, 0.3);
        }
        .mis-cursos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 22px;
        }
        .mis-curso-card {
          background: var(--bg-surface);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-light);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          color: inherit;
          display: flex;
          flex-direction: column;
        }
        .mis-curso-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-outset);
        }
        .mis-curso-card-image {
          width: 100%;
          height: 160px;
          background: var(--bg-subtle);
          overflow: hidden;
        }
        .mis-curso-card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .mis-curso-card-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          background: linear-gradient(135deg, var(--accent-subtle) 0%, var(--success-subtle) 100%);
        }
        .mis-curso-card-body {
          padding: 18px;
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .mis-curso-card-badges {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }
        .mis-curso-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .mis-curso-badge-active { background: var(--success-subtle); color: var(--success); }
        .mis-curso-badge-inactive { background: var(--danger-subtle); color: var(--danger); }
        .mis-curso-category {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          padding: 4px 0;
        }
        .mis-curso-card-body h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }
        .mis-curso-desc {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .mis-curso-teacher {
          font-size: 0.8rem;
          color: var(--text-secondary);
          margin-bottom: 16px;
        }
        .mis-curso-teacher-label {
          font-weight: 600;
          color: var(--text-primary);
        }
        .mis-curso-progress {
          margin-top: auto;
        }
        .mis-curso-progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .mis-curso-progress-label {
          font-size: 0.775rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .mis-curso-progress-percentage {
          font-size: 0.775rem;
          font-weight: 700;
          color: var(--accent);
        }
        .mis-curso-progress-bar {
          width: 100%;
          height: 6px;
          background: var(--bg-subtle);
          border-radius: 100px;
          overflow: hidden;
          box-shadow: var(--shadow-inset-sm);
        }
        .mis-curso-progress-fill {
          height: 100%;
          background: var(--gradient-accent);
          border-radius: 100px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mis-curso-progress-detail {
          display: block;
          font-size: 0.7rem;
          color: var(--text-tertiary);
          margin-top: 4px;
        }
        @media (max-width: 768px) {
          .mis-cursos-grid {
            grid-template-columns: 1fr;
          }
          .mis-cursos-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default MisCursos;
