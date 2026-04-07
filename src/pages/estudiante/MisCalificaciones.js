import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const MisCalificaciones = () => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [gradesByCourse, setGradesByCourse] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [globalAverage, setGlobalAverage] = useState(0);
  const [totalGraded, setTotalGraded] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId) fetchGrades();
  }, [usuarioId]);

  const fetchGrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: enrollments, error: enrollError } = await supabase
        .from('inscripciones')
        .select('id_curso, cursos(id_curso, nombre_curso, categoria, estado)')
        .eq('id_estudiante', usuarioId)
        .order('fecha_inscripcion', { ascending: false });

      if (enrollError) throw enrollError;

      const coursesData = [];
      let allGrades = [];
      let pendingCount = 0;

      for (const enrollment of enrollments || []) {
        const course = enrollment.cursos;
        if (!course) continue;

        const { data: gradesData, error: gradesError } = await supabase
          .from('calificaciones')
          .select('*')
          .eq('id_estudiante', usuarioId)
          .eq('id_curso', course.id_curso)
          .order('fecha_calificacion', { ascending: false });

        if (gradesError) throw gradesError;

        const activities = [];

        for (const grade of gradesData || []) {
          const activityName = grade.nombre_actividad || (grade.tipo_referencia === 'tarea' ? 'Tarea eliminada' : 'Cuestionario eliminado');
          const isDeleted = !grade.nombre_actividad;

          activities.push({
            id: grade.id_calificacion,
            tipo: grade.tipo_referencia,
            nombre: activityName,
            nota: grade.nota_obtenida,
            fecha: grade.fecha_calificacion,
            isDeleted,
          });
        }

        const courseAverage = activities.length > 0
          ? parseFloat((activities.reduce((sum, a) => sum + (a.nota || 0), 0) / activities.length).toFixed(2))
          : 0;

        coursesData.push({
          id_curso: course.id_curso,
          nombre_curso: course.nombre_curso,
          categoria: course.categoria,
          estado: course.estado,
          activities,
          average: courseAverage,
        });

        allGrades = allGrades.concat(activities);
      }

      const enrolledCourseIds = (enrollments || []).map((e) => e.id_curso);
      let allTasks = [];
      let allQuizzes = [];
      if (enrolledCourseIds.length > 0) {
        const { data: tasksData } = await supabase
          .from('tareas')
          .select('id_tarea, id_unidad, unidades(id_curso)')
          .in('unidades.id_curso', enrolledCourseIds);
        allTasks = tasksData || [];

        const { data: quizzesData } = await supabase
          .from('cuestionarios')
          .select('id_cuestionario, id_unidad, unidades(id_curso)')
          .in('unidades.id_curso', enrolledCourseIds);
        allQuizzes = quizzesData || [];
      }

      const gradedTaskIds = allGrades.filter((g) => g.tipo === 'tarea').map((g) => g.id);
      const gradedQuizIds = allGrades.filter((g) => g.tipo === 'cuestionario').map((g) => g.id);

      const pendingTasks = allTasks.filter((t) => !gradedTaskIds.includes(t.id_tarea)).length;
      const pendingQuizzes = allQuizzes.filter((q) => !gradedQuizIds.includes(q.id_cuestionario)).length;
      pendingCount = pendingTasks + pendingQuizzes;

      setGradesByCourse(coursesData);
      setTotalGraded(allGrades.length);
      setTotalPending(pendingCount);

      if (allGrades.length > 0) {
        const globalAvg = parseFloat((allGrades.reduce((sum, g) => sum + (g.nota || 0), 0) / allGrades.length).toFixed(2));
        setGlobalAverage(globalAvg);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="mc-loading">Cargando calificaciones...</div>;
  }

  return (
    <div className="mc-container">
      <div className="mc-header">
        <div>
          <h1>Mis Calificaciones</h1>
          <p>Resumen de tu rendimiento acad&eacute;mico</p>
        </div>
      </div>

      {error && <div className="mc-error">{error}</div>}

      <div className="mc-summary-cards">
        <div className="mc-summary-card">
          <span className="mc-summary-icon">&#128202;</span>
          <div className="mc-summary-content">
            <span className="mc-summary-value">{globalAverage.toFixed(1)}</span>
            <span className="mc-summary-label">Promedio Global</span>
          </div>
        </div>
        <div className="mc-summary-card">
          <span className="mc-summary-icon">&#9989;</span>
          <div className="mc-summary-content">
            <span className="mc-summary-value">{totalGraded}</span>
            <span className="mc-summary-label">Actividades Calificadas</span>
          </div>
        </div>
        <div className="mc-summary-card">
          <span className="mc-summary-icon">&#9203;</span>
          <div className="mc-summary-content">
            <span className="mc-summary-value">{totalPending}</span>
            <span className="mc-summary-label">Actividades Pendientes</span>
          </div>
        </div>
      </div>

      {gradesByCourse.length === 0 ? (
        <div className="mc-empty">
          <p>No tienes cursos inscritos a&uacute;n.</p>
          <Link to="/estudiante/catalog" className="mc-btn-primary">
            Explorar cat&aacute;logo de cursos
          </Link>
        </div>
      ) : (
        <div className="mc-courses">
          {gradesByCourse.map((course) => (
            <div key={course.id_curso} className="mc-course-card">
              <div className="mc-course-header">
                <div className="mc-course-title">
                  <h2>{course.nombre_curso}</h2>
                  <div className="mc-course-badges">
                    <span className={`mc-badge ${course.estado === 'activo' ? 'mc-badge-active' : 'mc-badge-inactive'}`}>
                      {course.estado}
                    </span>
                    <span className="mc-category">{course.categoria}</span>
                  </div>
                </div>
                <div className="mc-course-average">
                  <span className="mc-average-value">{course.average.toFixed(1)}</span>
                  <span className="mc-average-label">Promedio</span>
                </div>
              </div>

              {course.activities.length === 0 ? (
                <p className="mc-no-grades">No hay actividades calificadas a&uacute;n en este curso.</p>
              ) : (
                <div className="mc-grades-table-container">
                  <table className="mc-grades-table">
                    <thead>
                      <tr>
                        <th className="mc-th">Tipo</th>
                        <th className="mc-th">Actividad</th>
                        <th className="mc-th">Calificaci&oacute;n</th>
                        <th className="mc-th">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {course.activities.map((activity) => (
                        <tr key={activity.id} className={`mc-tr ${activity.isDeleted ? 'mc-tr-deleted' : ''}`}>
                          <td className="mc-td">
                            <span className={`mc-type-badge ${activity.tipo === 'tarea' ? 'mc-type-tarea' : 'mc-type-cuestionario'}`}>
                              {activity.tipo === 'tarea' ? 'Tarea' : 'Cuestionario'}
                            </span>
                          </td>
                          <td className="mc-td mc-activity-name">
                            {activity.nombre}
                            {activity.isDeleted && <span className="mc-deleted-badge">Eliminada</span>}
                          </td>
                          <td className="mc-td">
                            <span className={`mc-grade-value ${activity.isDeleted ? '' : (activity.nota >= 60 ? 'mc-grade-pass' : 'mc-grade-fail')}`}>
                              {activity.nota !== null ? `${activity.nota.toFixed(1)}/100` : 'Sin nota'}
                            </span>
                          </td>
                          <td className="mc-td mc-date">
                            {new Date(activity.fecha).toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .mc-container {
          padding: 0;
          max-width: 100%;
        }
        .mc-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 16px;
          color: var(--text-tertiary);
        }
        .mc-header {
          margin-bottom: 28px;
        }
        .mc-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(1.5rem, 2.5vw, 2rem);
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px 0;
          letter-spacing: -0.4px;
        }
        .mc-header p {
          color: var(--text-secondary);
          margin: 0;
          font-size: 0.9rem;
        }
        .mc-error {
          background: var(--danger-subtle);
          border: 1px solid rgba(212, 107, 107, 0.15);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 0.825rem;
        }
        .mc-summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 18px;
          margin-bottom: 28px;
        }
        .mc-summary-card {
          background: var(--bg-surface);
          border-radius: 18px;
          border: 1px solid var(--border-light);
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-outset-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mc-summary-card:hover {
          box-shadow: var(--shadow-outset);
          transform: translateY(-2px);
        }
        .mc-summary-icon {
          font-size: 28px;
          flex-shrink: 0;
        }
        .mc-summary-content {
          display: flex;
          flex-direction: column;
        }
        .mc-summary-value {
          font-family: 'Outfit', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.2px;
        }
        .mc-summary-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .mc-empty {
          text-align: center;
          padding: 60px 20px;
          background: var(--bg-surface);
          border-radius: 20px;
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-outset-sm);
        }
        .mc-empty p {
          color: var(--text-tertiary);
          font-size: 0.9rem;
          margin-bottom: 16px;
        }
        .mc-btn-primary {
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
        .mc-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(91, 141, 239, 0.3);
        }
        .mc-courses {
          display: flex;
          flex-direction: column;
          gap: 22px;
        }
        .mc-course-card {
          background: var(--bg-surface);
          border-radius: 20px;
          border: 1px solid var(--border-light);
          overflow: hidden;
          box-shadow: var(--shadow-outset-sm);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .mc-course-card:hover {
          box-shadow: var(--shadow-outset);
        }
        .mc-course-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid var(--border-light);
          gap: 16px;
        }
        .mc-course-title h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }
        .mc-course-badges {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .mc-badge {
          font-size: 0.65rem;
          padding: 3px 10px;
          border-radius: 100px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .mc-badge-active {
          background: var(--success-subtle);
          color: var(--success);
        }
        .mc-badge-inactive {
          background: var(--danger-subtle);
          color: var(--danger);
        }
        .mc-category {
          font-size: 0.7rem;
          color: var(--text-tertiary);
        }
        .mc-course-average {
          text-align: center;
          flex-shrink: 0;
        }
        .mc-average-value {
          display: block;
          font-family: 'Outfit', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--accent);
          letter-spacing: -0.2px;
        }
        .mc-average-label {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .mc-no-grades {
          color: var(--text-tertiary);
          font-size: 0.825rem;
          padding: 24px;
          text-align: center;
          margin: 0;
        }
        .mc-grades-table-container {
          overflow-x: auto;
        }
        .mc-grades-table {
          width: 100%;
          border-collapse: collapse;
        }
        .mc-th {
          text-align: left;
          padding: 12px 16px;
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-tertiary);
          background: var(--bg-subtle);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--border-light);
        }
        .mc-tr {
          border-bottom: 1px solid var(--border-light);
        }
        .mc-tr:last-child {
          border-bottom: none;
        }
        .mc-tr:hover {
          background: var(--bg-subtle);
        }
        .mc-td {
          padding: 12px 16px;
          font-size: 0.825rem;
          color: var(--text-primary);
        }
        .mc-type-badge {
          font-size: 0.65rem;
          padding: 4px 10px;
          border-radius: 100px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .mc-type-tarea {
          background: var(--info-subtle);
          color: var(--info);
        }
        .mc-type-cuestionario {
          background: rgba(212, 107, 107, 0.1);
          color: var(--danger);
        }
        .mc-activity-name { font-weight: 500; }
        .mc-deleted-badge { display: inline-block; background: var(--danger-subtle); color: var(--danger); font-size: 0.6rem; padding: 2px 8px; border-radius: 10px; font-weight: 600; margin-left: 8px; text-transform: uppercase; }
        .mc-tr-deleted { opacity: 0.6; }
        .mc-tr-deleted .mc-activity-name { text-decoration: line-through; color: var(--text-tertiary); }
        .mc-grade-value {
          font-weight: 700;
          font-size: 0.875rem;
        }
        .mc-grade-pass {
          color: var(--success);
        }
        .mc-grade-fail {
          color: var(--danger);
        }
        .mc-date {
          color: var(--text-secondary);
          font-size: 0.775rem;
        }
        @media (max-width: 768px) {
          .mc-container {
            padding: 0;
          }
          .mc-summary-cards {
            grid-template-columns: 1fr;
          }
          .mc-course-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .mc-td, .mc-th {
            padding: 8px 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default MisCalificaciones;
