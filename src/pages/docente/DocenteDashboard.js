import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const DocenteDashboard = () => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [stats, setStats] = useState({ myCourses: 0, totalStudents: 0, pendingDeliveries: 0, pendingEvaluations: 0 });
  const [myCourses, setMyCourses] = useState([]);
  const [recentDeliveries, setRecentDeliveries] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
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
    if (usuarioId) fetchDashboardData();
  }, [usuarioId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: courses, error: coursesError } = await supabase
        .from('cursos')
        .select('id_curso, nombre_curso, categoria, estado, fecha_creacion')
        .eq('id_docente', usuarioId)
        .order('fecha_creacion', { ascending: false });

      if (coursesError) throw coursesError;

      const courseIds = (courses || []).map((c) => c.id_curso);

      let totalStudents = 0;
      if (courseIds.length > 0) {
        const { count, error: countError } = await supabase
          .from('inscripciones')
          .select('id_inscripcion', { count: 'exact', head: true })
          .in('id_curso', courseIds);
        if (countError) throw countError;
        totalStudents = count || 0;
      }

      let pendingDeliveries = 0;
      if (courseIds.length > 0) {
        const { data: unitsForTasks, error: unitsForTasksError } = await supabase
          .from('unidades')
          .select('id_unidad')
          .in('id_curso', courseIds);

        const unitIdsForTasks = (unitsForTasks || []).map((u) => u.id_unidad);
        let tasks = [];
        if (unitIdsForTasks.length > 0) {
          const { data: tasksData, error: tasksError } = await supabase
            .from('tareas')
            .select('id_tarea')
            .in('id_unidad', unitIdsForTasks);
          if (!tasksError) tasks = tasksData || [];
        }

        if (tasks && tasks.length > 0) {
          const taskIds = tasks.map((t) => t.id_tarea);
          const { count, error: deliveriesError } = await supabase
            .from('entregas')
            .select('id_entrega', { count: 'exact', head: true })
            .in('id_tarea', taskIds)
            .is('calificacion', null);
          if (!deliveriesError) pendingDeliveries = count || 0;
        }
      }

      const { data: allDeliveries, error: deliveriesFetchError } = await supabase
        .from('entregas')
        .select(`
          id_entrega,
          fecha_entrega,
          evidencia,
          calificacion,
          tareas!inner(id_tarea, titulo_tarea, id_unidad),
          usuarios(id_usuario, nombre)
        `)
        .is('calificacion', null)
        .order('fecha_entrega', { ascending: false })
        .limit(5);

      let filteredDeliveries = [];
      if (!deliveriesFetchError && allDeliveries && courseIds.length > 0) {
        const { data: units, error: unitsError } = await supabase
          .from('unidades')
          .select('id_unidad, id_curso')
          .in('id_curso', courseIds);

        if (!unitsError) {
          const unitIds = (units || []).map((u) => u.id_unidad);
          filteredDeliveries = allDeliveries.filter((d) =>
            unitIds.includes(d.tareas.id_unidad)
          );
        }
      }

      let deadlines = [];
      if (courseIds.length > 0) {
        const { data: units, error: unitsErr } = await supabase
          .from('unidades')
          .select('id_unidad')
          .in('id_curso', courseIds);

        if (!unitsErr && units) {
          const unitIds = units.map((u) => u.id_unidad);
          const today = new Date().toISOString();
          const { data: tasks, error: tasksErr } = await supabase
            .from('tareas')
            .select('id_tarea, titulo_tarea, fecha_limite, id_unidad')
            .in('id_unidad', unitIds)
            .gte('fecha_limite', today)
            .order('fecha_limite', { ascending: true })
            .limit(5);

          if (!tasksErr && tasks) {
            const taskUnitIds = tasks.map((t) => t.id_unidad);
            const { data: unitsWithCourse, error: uwcErr } = await supabase
              .from('unidades')
              .select('id_unidad, id_curso')
              .in('id_unidad', taskUnitIds);

            if (!uwcErr) {
              const unitCourseMap = {};
              (unitsWithCourse || []).forEach((u) => {
                unitCourseMap[u.id_unidad] = u.id_curso;
              });
              deadlines = tasks.map((t) => ({
                ...t,
                id_curso: unitCourseMap[t.id_unidad],
              }));
            }
          }
        }
      }

      setStats({
        myCourses: courses.length,
        totalStudents,
        pendingDeliveries,
        pendingEvaluations: pendingDeliveries,
      });
      setMyCourses(courses || []);
      setRecentDeliveries(filteredDeliveries);
      setUpcomingDeadlines(deadlines);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="docente-dashboard-loading">Cargando dashboard...</div>;
  }

  return (
    <div className="docente-dashboard">
      <div className="docente-dashboard-header">
        <h1>Panel del Docente</h1>
        <p>Bienvenido, {user?.email}</p>
      </div>

      {error && <div className="docente-error-message">{error}</div>}

      <div className="docente-stats-grid">
        <div className="docente-stat-card">
          <div className="docente-stat-icon docente-stat-icon-courses">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </div>
          <div className="docente-stat-info">
            <h3>{stats.courses}</h3>
            <p>Mis Cursos</p>
          </div>
        </div>
        <div className="docente-stat-card">
          <div className="docente-stat-icon docente-stat-icon-students">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="docente-stat-info">
            <h3>{stats.students}</h3>
            <p>Estudiantes</p>
          </div>
        </div>
        <div className="docente-stat-card">
          <div className="docente-stat-icon docente-stat-icon-deliveries">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <div className="docente-stat-info">
            <h3>{stats.deliveries}</h3>
            <p>Entregas</p>
          </div>
        </div>
        <div className="docente-stat-card">
          <div className="docente-stat-icon docente-stat-icon-evaluations">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>
          </div>
          <div className="docente-stat-info">
            <h3>{stats.evaluations}</h3>
            <p>Evaluaciones</p>
          </div>
        </div>
      </div>

      <div className="docente-dashboard-content-grid">
        <div className="docente-dashboard-section">
          <div className="docente-section-header">
            <h2>Mis Cursos</h2>
            <Link to="/docente/my-courses" className="docente-link-btn">Ver todos</Link>
          </div>
          {myCourses.length === 0 ? (
            <p className="docente-no-data">No tienes cursos asignados</p>
          ) : (
            <div className="docente-courses-mini-list">
              {myCourses.slice(0, 5).map((c) => (
                <div key={c.id_curso} className="docente-course-mini-card">
                  <div className="docente-course-mini-info">
                    <h4>{c.nombre_curso}</h4>
                    <span className={`docente-badge ${c.estado === 'activo' ? 'docente-badge-active' : 'docente-badge-inactive'}`}>
                      {c.estado}
                    </span>
                    <span className="docente-course-cat">{c.categoria}</span>
                  </div>
                  <Link to={`/docente/course/${c.id_curso}/content`} className="docente-manage-link">
                    Gestionar
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="docente-dashboard-section docente-section-full">
          <div className="docente-section-header">
            <h2>Próximas Fechas Límite</h2>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="docente-no-data">No hay fechas límite próximas</p>
          ) : (
            <div className="docente-deadlines-list">
              {upcomingDeadlines.map((d) => (
                <div key={d.id_tarea} className="docente-deadline-item">
                  <div className="docente-deadline-info">
                    <h4>{d.titulo_tarea}</h4>
                    <span className="docente-deadline-date">
                      {new Date(d.fecha_limite).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className={`docente-deadline-badge ${
                    new Date(d.fecha_limite) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                      ? 'docente-deadline-urgent'
                      : 'docente-deadline-normal'
                  }`}>
                    {Math.ceil((new Date(d.fecha_limite) - new Date()) / (1000 * 60 * 60 * 24))} días
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .docente-dashboard {
          padding: 0;
          max-width: 100%;
          margin: 0 auto;
        }
        .docente-dashboard-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 18px;
          color: var(--text-secondary);
        }
        .docente-dashboard-header {
          margin-bottom: 32px;
        }
        .docente-dashboard-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .docente-dashboard-header p {
          color: var(--text-secondary);
          margin: 0;
        }
        .docente-error-message {
          background: var(--danger-subtle);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
        }
        .docente-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .docente-stat-card {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-default);
        }
        .docente-stat-icon {
          font-size: 36px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
        }
        .docente-stat-icon-courses { background: var(--success-subtle); }
        .docente-stat-icon-students { background: var(--info-subtle); }
        .docente-stat-icon-deliveries { background: var(--warning-subtle); }
        .docente-stat-icon-evaluations { background: rgba(212, 107, 107, 0.1); }
        .docente-stat-info h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          margin: 0;
          color: var(--text-primary);
        }
        .docente-stat-info p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .docente-dashboard-content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .docente-dashboard-content-grid {
            grid-template-columns: 1fr;
          }
        }
        .docente-dashboard-section {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-default);
        }
        .docente-section-full {
          grid-column: 1 / -1;
        }
        .docente-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .docente-section-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          color: var(--text-primary);
          margin: 0;
        }
        .docente-link-btn {
          color: var(--accent);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .docente-link-btn:hover {
          text-decoration: underline;
        }
        .docente-no-data {
          color: var(--text-tertiary);
          text-align: center;
          padding: 24px;
        }
        .docente-courses-mini-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .docente-course-mini-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--bg-subtle);
          border-radius: 12px;
          border: 1px solid var(--border-default);
        }
        .docente-course-mini-info h4 {
          font-family: 'Outfit', sans-serif;
          margin: 0 0 6px 0;
          font-size: 14px;
          color: var(--text-primary);
        }
        .docente-course-mini-info .docente-badge {
          margin-right: 8px;
        }
        .docente-course-cat {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .docente-manage-link {
          color: var(--accent);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: 10px;
          background: var(--accent-subtle);
          transition: background 0.2s;
        }
        .docente-manage-link:hover {
          background: var(--accent-medium);
        }
        .docente-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .docente-badge-active { background: var(--success-subtle); color: var(--success); }
        .docente-badge-inactive { background: var(--danger-subtle); color: var(--danger); }
        .docente-table-container {
          overflow-x: auto;
        }
        .docente-table {
          width: 100%;
          border-collapse: collapse;
        }
        .docente-table th,
        .docente-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--border-default);
          font-size: 14px;
        }
        .docente-table th {
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-weight: 600;
        }
        .docente-table td {
          color: var(--text-secondary);
        }
        .docente-deadlines-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .docente-deadline-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: var(--bg-subtle);
          border-radius: 12px;
          border: 1px solid var(--border-default);
        }
        .docente-deadline-info h4 {
          font-family: 'Outfit', sans-serif;
          margin: 0 0 4px 0;
          font-size: 14px;
          color: var(--text-primary);
        }
        .docente-deadline-date {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .docente-deadline-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }
        .docente-deadline-urgent {
          background: var(--danger-subtle);
          color: var(--danger);
        }
        .docente-deadline-normal {
          background: var(--success-subtle);
          color: var(--success);
        }
      `}</style>
    </div>
  );
};

export default DocenteDashboard;
