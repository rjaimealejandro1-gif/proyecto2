import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import CourseProgressBar from '../../components/CourseProgressBar';
import AcademicCalendar from '../../components/AcademicCalendar';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const FALLBACK_QUOTES = [
  'La educación es el arma más poderosa que puedes usar para cambiar el mundo. — Nelson Mandela',
  'El único modo de hacer un gran trabajo es amar lo que haces. — Steve Jobs',
  'El éxito es la suma de pequeños esfuerzos repetidos día tras día. — Robert Collier',
  'No cuentes los días, haz que los días cuenten. — Muhammad Ali',
  'La persistencia puede transformar el fracaso en un logro extraordinario. — Matt Biondi',
];

const EstudianteDashboard = () => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [stats, setStats] = useState({ enrolledCourses: 0, completedTasks: 0, averageGrade: 0, pendingDeliveries: 0 });
  const [myCourses, setMyCourses] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [recentGrades, setRecentGrades] = useState([]);
  const [quote, setQuote] = useState('');
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
    if (usuarioId) {
      fetchDashboardData();
      fetchQuote();
    }
  }, [usuarioId]);

  const fetchQuote = async () => {
    try {
      const response = await fetch('https://dummyjson.com/quotes/random', { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('API error');
      const data = await response.json();
      setQuote(`"${data.quote}" — ${data.author}`);
    } catch {
      setQuote(FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)]);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: enrollments, error: enrollError } = await supabase
        .from('inscripciones')
        .select('id_curso, fecha_inscripcion, cursos(id_curso, nombre_curso, categoria, estado)')
        .eq('id_estudiante', usuarioId);

      if (enrollError) throw enrollError;

      const enrolledCourses = enrollments || [];
      const courseIds = (enrolledCourses || []).map((e) => e.cursos?.id_curso).filter(Boolean);

      let completedTasks = 0;
      let totalTasks = 0;
      let pendingDeliveries = 0;

      if (courseIds.length > 0) {
        const { data: units, error: unitsError } = await supabase
          .from('unidades')
          .select('id_unidad, id_curso')
          .in('id_curso', courseIds);

        if (!unitsError && units && units.length > 0) {
          const unitIds = units.map((u) => u.id_unidad);

          const { data: tasks, error: tasksError } = await supabase
            .from('tareas')
            .select('id_tarea, titulo_tarea, fecha_limite, id_unidad')
            .in('id_unidad', unitIds);

          if (!tasksError && tasks) {
            totalTasks = tasks.length;
            const taskIds = tasks.map((t) => t.id_tarea);

            const { data: deliveries, error: deliveriesError } = await supabase
              .from('entregas')
              .select('id_entrega, calificacion, id_tarea')
              .in('id_tarea', taskIds)
              .eq('id_estudiante', usuarioId);

            if (!deliveriesError && deliveries) {
              completedTasks = deliveries.filter((d) => d.calificacion !== null).length;
              pendingDeliveries = deliveries.filter((d) => d.calificacion === null).length;
            }
          }
        }
      }

      let averageGrade = 0;
      if (courseIds.length > 0) {
        const { data: units, error: unitsErr } = await supabase
          .from('unidades')
          .select('id_unidad')
          .in('id_curso', courseIds);

        if (!unitsErr && units && units.length > 0) {
          const unitIds = units.map((u) => u.id_unidad);
          const { data: tasks, error: tasksErr } = await supabase
            .from('tareas')
            .select('id_tarea')
            .in('id_unidad', unitIds);

          if (!tasksErr && tasks && tasks.length > 0) {
            const taskIds = tasks.map((t) => t.id_tarea);
            const { data: gradedDeliveries, error: gradedErr } = await supabase
              .from('entregas')
              .select('calificacion')
              .in('id_tarea', taskIds)
              .eq('id_estudiante', usuarioId)
              .not('calificacion', 'is', null);

            if (!gradedErr && gradedDeliveries && gradedDeliveries.length > 0) {
              const sum = gradedDeliveries.reduce((acc, d) => acc + (d.calificacion || 0), 0);
              averageGrade = parseFloat((sum / gradedDeliveries.length).toFixed(1));
            }
          }
        }
      }

      setStats({
        enrolledCourses: enrolledCourses.length,
        completedTasks,
        averageGrade,
        pendingDeliveries,
      });

      const coursesWithDetails = enrolledCourses
        .filter((e) => e.cursos)
        .map((e) => ({
          id_curso: e.cursos.id_curso,
          nombre_curso: e.cursos.nombre_curso,
          categoria: e.cursos.categoria,
          estado: e.cursos.estado,
          fecha_inscripcion: e.fecha_inscripcion,
        }));
      setMyCourses(coursesWithDetails);

      let deadlines = [];
      if (courseIds.length > 0) {
        const { data: units, error: unitsErr } = await supabase
          .from('unidades')
          .select('id_unidad, id_curso, nombre_unidad')
          .in('id_curso', courseIds);

        if (!unitsErr && units && units.length > 0) {
          const unitIds = units.map((u) => u.id_unidad);
          const unitCourseMap = {};
          const unitNameMap = {};
          units.forEach((u) => {
            unitCourseMap[u.id_unidad] = u.id_curso;
            unitNameMap[u.id_unidad] = u.nombre_unidad;
          });

          const today = new Date().toISOString().split('T')[0];
          const { data: tasks, error: tasksErr } = await supabase
            .from('tareas')
            .select('id_tarea, titulo_tarea, fecha_limite, id_unidad')
            .in('id_unidad', unitIds)
            .gte('fecha_limite', today)
            .order('fecha_limite', { ascending: true })
            .limit(5);

          if (!tasksErr && tasks) {
            deadlines = tasks.map((t) => ({
              ...t,
              id_curso: unitCourseMap[t.id_unidad],
              nombre_unidad: unitNameMap[t.id_unidad],
            }));
          }
        }
      }
      setUpcomingDeadlines(deadlines);

      let grades = [];
      if (courseIds.length > 0) {
        const { data: units, error: unitsErr } = await supabase
          .from('unidades')
          .select('id_unidad, id_curso, nombre_unidad')
          .in('id_curso', courseIds);

        if (!unitsErr && units && units.length > 0) {
          const unitIds = units.map((u) => u.id_unidad);
          const unitCourseMap = {};
          const unitNameMap = {};
          units.forEach((u) => {
            unitCourseMap[u.id_unidad] = u.id_curso;
            unitNameMap[u.id_unidad] = u.nombre_unidad;
          });

          const { data: tasks, error: tasksErr } = await supabase
            .from('tareas')
            .select('id_tarea, titulo_tarea')
            .in('id_unidad', unitIds);

          if (!tasksErr && tasks && tasks.length > 0) {
            const taskIds = tasks.map((t) => t.id_tarea);
            const taskTitleMap = {};
            tasks.forEach((t) => { taskTitleMap[t.id_tarea] = t.titulo_tarea; });

            const { data: gradedDeliveries, error: gradedErr } = await supabase
              .from('entregas')
              .select('id_entrega, calificacion, fecha_entrega, id_tarea')
              .in('id_tarea', taskIds)
              .eq('id_estudiante', usuarioId)
              .not('calificacion', 'is', null)
              .order('fecha_entrega', { ascending: false })
              .limit(5);

            if (!gradedErr && gradedDeliveries) {
              grades = gradedDeliveries.map((d) => ({
                id_entrega: d.id_entrega,
                titulo_tarea: taskTitleMap[d.id_tarea] || 'Tarea',
                calificacion: d.calificacion,
                fecha_entrega: d.fecha_entrega,
                id_curso: unitCourseMap[units.find((u) => u.id_unidad === tasks.find((t) => t.id_tarea === d.id_tarea)?.id_unidad)?.id_curso],
              }));
            }
          }
        }
      }
      setRecentGrades(grades);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="estudiante-dashboard-loading">Cargando dashboard...</div>;
  }

  return (
    <div className="estudiante-dashboard">
      <div className="estudiante-dashboard-header">
        <h1>Panel del Estudiante</h1>
        <p>Bienvenido, {user?.email}</p>
      </div>

      {quote && (
        <div className="estudiante-quote-card">
          <span className="estudiante-quote-icon">&#10077;</span>
          <p className="estudiante-quote-text">{quote}</p>
        </div>
      )}

      {error && <div className="estudiante-error-message">{error}</div>}

      <div className="estudiante-stats-grid">
        <div className="estudiante-stat-card">
          <div className="estudiante-stat-icon estudiante-stat-icon-courses">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </div>
          <div className="estudiante-stat-info">
            <h3>{stats.enrolledCourses}</h3>
            <p>Cursos Inscritos</p>
          </div>
        </div>
        <div className="estudiante-stat-card">
          <div className="estudiante-stat-icon estudiante-stat-icon-tasks">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          </div>
          <div className="estudiante-stat-info">
            <h3>{stats.completedTasks}</h3>
            <p>Tareas Completadas</p>
          </div>
        </div>
        <div className="estudiante-stat-card">
          <div className="estudiante-stat-icon estudiante-stat-icon-grade">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
          </div>
          <div className="estudiante-stat-info">
            <h3>{stats.averageGrade}</h3>
            <p>Promedio General</p>
          </div>
        </div>
        <div className="estudiante-stat-card">
          <div className="estudiante-stat-icon estudiante-stat-icon-pending">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="estudiante-stat-info">
            <h3>{stats.pendingDeliveries}</h3>
            <p>Entregas Pendientes</p>
          </div>
        </div>
      </div>

      <div className="estudiante-dashboard-content-grid">
        <div className="estudiante-dashboard-section">
          <div className="estudiante-section-header">
            <h2>Mis Cursos Inscritos</h2>
            <Link to="/estudiante/my-courses" className="estudiante-link-btn">Ver todos</Link>
          </div>
          {myCourses.length === 0 ? (
            <div className="estudiante-no-data">
              <p>No estás inscrito en ningún curso</p>
              <Link to="/estudiante/catalog" className="estudiante-btn-primary">Explorar catálogo</Link>
            </div>
          ) : (
            <div className="estudiante-courses-mini-list">
              {myCourses.slice(0, 5).map((c) => (
                <div key={c.id_curso} className="estudiante-course-mini-card">
                  <div className="estudiante-course-mini-info">
                    <h4>{c.nombre_curso}</h4>
                    <span className={`estudiante-badge ${c.estado === 'activo' ? 'estudiante-badge-active' : 'estudiante-badge-inactive'}`}>
                      {c.estado}
                    </span>
                    <span className="estudiante-course-cat">{c.categoria}</span>
                  </div>
                  <Link to={`/course/${c.id_curso}`} className="estudiante-view-link">
                    Ver curso
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="estudiante-dashboard-section">
          <div className="estudiante-section-header">
            <h2>Próximas Fechas Límite</h2>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="estudiante-no-data">No hay fechas límite próximas</p>
          ) : (
            <div className="estudiante-deadlines-list">
              {upcomingDeadlines.map((d) => (
                <div key={d.id_tarea} className="estudiante-deadline-item">
                  <div className="estudiante-deadline-info">
                    <h4>{d.titulo_tarea}</h4>
                    <span className="estudiante-deadline-unit">{d.nombre_unidad}</span>
                    <span className="estudiante-deadline-date">
                      {new Date(d.fecha_limite).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <span className={`estudiante-deadline-badge ${
                    new Date(d.fecha_limite) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                      ? 'estudiante-deadline-urgent'
                      : 'estudiante-deadline-normal'
                  }`}>
                    {Math.ceil((new Date(d.fecha_limite) - new Date()) / (1000 * 60 * 60 * 24))} días
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="estudiante-dashboard-section">
          <div className="estudiante-section-header">
            <h2>Calendario Académico</h2>
          </div>
          <AcademicCalendar />
        </div>
      </div>

      {myCourses.length > 0 && (
        <div className="estudiante-dashboard-section estudiante-section-full">
          <div className="estudiante-section-header">
            <h2>Progreso en Cursos</h2>
            <Link to="/estudiante/insignias" className="estudiante-link-btn">Ver insignias</Link>
          </div>
          <div className="estudiante-progress-grid">
            {myCourses.slice(0, 3).map((c) => (
              <CourseProgressBar key={c.id_curso} courseId={c.id_curso} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        .estudiante-dashboard {
          padding: 0;
          max-width: 100%;
        }
        .estudiante-dashboard-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 16px;
          color: var(--text-tertiary);
        }
        .estudiante-dashboard-header {
          margin-bottom: 28px;
        }
        .estudiante-dashboard-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: clamp(1.5rem, 2.5vw, 2rem);
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 6px 0;
          letter-spacing: -0.4px;
        }
        .estudiante-dashboard-header p {
          color: var(--text-secondary);
          margin: 0;
          font-size: 0.9rem;
        }
        .estudiante-quote-card {
          background: var(--bg-surface);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid var(--border-light);
          box-shadow: var(--shadow-outset-sm);
          color: var(--text-secondary);
          padding: 22px 26px;
          border-radius: 20px;
          margin-bottom: 28px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          position: relative;
          overflow: hidden;
        }
        .estudiante-quote-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--gradient-accent);
          border-radius: 4px;
        }
        .estudiante-quote-icon {
          font-size: 28px;
          line-height: 1;
          opacity: 0.3;
          color: var(--accent);
          flex-shrink: 0;
        }
        .estudiante-quote-text {
          margin: 0;
          font-size: 0.9rem;
          font-style: italic;
          line-height: 1.6;
          color: var(--text-secondary);
        }
        .estudiante-error-message {
          background: var(--danger-subtle);
          border: 1px solid rgba(212, 107, 107, 0.15);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          font-size: 0.825rem;
        }
        .estudiante-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 28px;
        }
        .estudiante-stat-card {
          background: var(--bg-surface);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-light);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .estudiante-stat-card:hover {
          box-shadow: var(--shadow-outset);
          transform: translateY(-2px);
        }
        .estudiante-stat-icon {
          font-size: 28px;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          box-shadow: var(--shadow-inset-sm);
        }
        .estudiante-stat-icon-courses { background: var(--success-subtle); }
        .estudiante-stat-icon-tasks { background: var(--accent-subtle); }
        .estudiante-stat-icon-grade { background: var(--warning-subtle); }
        .estudiante-stat-icon-pending { background: var(--info-subtle); }
        .estudiante-stat-info h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
          letter-spacing: -0.3px;
          line-height: 1.1;
        }
        .estudiante-stat-info p {
          margin: 0;
          color: var(--text-tertiary);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .estudiante-dashboard-content-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 24px;
        }
        @media (max-width: 900px) {
          .estudiante-dashboard-content-grid {
            grid-template-columns: 1fr;
          }
        }
        .estudiante-dashboard-section {
          background: var(--bg-surface);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-light);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .estudiante-dashboard-section:hover {
          box-shadow: var(--shadow-outset);
        }
        .estudiante-section-full {
          grid-column: 1 / -1;
        }
        .estudiante-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--border-light);
        }
        .estudiante-section-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.1px;
        }
        .estudiante-link-btn {
          color: var(--accent);
          text-decoration: none;
          font-size: 0.8rem;
          font-weight: 600;
          transition: color 0.2s;
        }
        .estudiante-link-btn:hover {
          color: var(--accent-light);
          text-decoration: none;
        }
        .estudiante-no-data {
          color: var(--text-tertiary);
          text-align: center;
          padding: 32px 16px;
          font-size: 0.85rem;
        }
        .estudiante-no-data p {
          margin-bottom: 14px;
        }
        .estudiante-btn-primary {
          display: inline-block;
          background: var(--gradient-accent);
          color: #fff;
          padding: 10px 22px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 0.825rem;
          font-weight: 600;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 14px rgba(91, 141, 239, 0.2);
        }
        .estudiante-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(91, 141, 239, 0.3);
        }
        .estudiante-courses-mini-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .estudiante-course-mini-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: var(--bg-subtle);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 14px;
          border: 1px solid var(--border-light);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .estudiante-course-mini-card:hover {
          background: var(--bg-elevated);
          box-shadow: var(--shadow-outset-sm);
        }
        .estudiante-course-mini-info h4 {
          margin: 0 0 6px 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .estudiante-course-cat {
          font-size: 0.7rem;
          color: var(--text-tertiary);
          margin-left: 8px;
        }
        .estudiante-view-link {
          color: var(--accent);
          text-decoration: none;
          font-size: 0.775rem;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 10px;
          background: var(--accent-subtle);
          transition: all 0.2s;
        }
        .estudiante-view-link:hover {
          background: var(--accent-medium);
        }
        .estudiante-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 0.65rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-right: 6px;
        }
        .estudiante-badge-active { background: var(--success-subtle); color: var(--success); }
        .estudiante-badge-inactive { background: var(--danger-subtle); color: var(--danger); }
        .estudiante-deadlines-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .estudiante-deadline-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: var(--bg-subtle);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 14px;
          border: 1px solid var(--border-light);
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .estudiante-deadline-item:hover {
          background: var(--bg-elevated);
          box-shadow: var(--shadow-outset-sm);
        }
        .estudiante-deadline-info h4 {
          margin: 0 0 4px 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .estudiante-deadline-unit {
          display: block;
          font-size: 0.7rem;
          color: var(--text-tertiary);
          margin-bottom: 2px;
        }
        .estudiante-deadline-date {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }
        .estudiante-deadline-badge {
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
        }
        .estudiante-deadline-urgent {
          background: var(--danger-subtle);
          color: var(--danger);
        }
        .estudiante-deadline-normal {
          background: var(--success-subtle);
          color: var(--success);
        }
        .estudiante-table-container {
          overflow-x: auto;
        }
        .estudiante-table {
          width: 100%;
          border-collapse: collapse;
        }
        .estudiante-table th,
        .estudiante-table td {
          padding: 10px 12px;
          text-align: left;
          border-bottom: 1px solid var(--border-light);
          font-size: 0.825rem;
        }
        .estudiante-table th {
          background: var(--bg-subtle);
          color: var(--text-tertiary);
          font-weight: 600;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .estudiante-table td {
          color: var(--text-primary);
        }
        .estudiante-grade-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .estudiante-grade-pass { background: var(--success-subtle); color: var(--success); }
        .estudiante-grade-fail { background: var(--danger-subtle); color: var(--danger); }
        .estudiante-progress-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 18px; }
      `}</style>
    </div>
  );
};

export default EstudianteDashboard;
