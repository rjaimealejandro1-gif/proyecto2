import { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { getUsuarioIdFromUser } from '../utils/userHelpers';

const TeacherStats = ({ courseId = null }) => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalTasks: 0,
    totalDeliveries: 0,
    gradedDeliveries: 0,
    pendingGrades: 0,
    avgGrade: 0,
    completionRate: 0,
  });
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [gradeDistribution, setGradeDistribution] = useState([]);

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
      fetchOverallStats();
      fetchCourses();
    }
  }, [usuarioId]);

  useEffect(() => {
    if (selectedCourse) fetchCourseStats(selectedCourse);
  }, [selectedCourse]);

  const fetchOverallStats = async () => {
    setLoading(true);
    try {
      const { data: coursesData } = await supabase
        .from('cursos')
        .select('id_curso')
        .eq('id_docente', usuarioId);

      const courseIds = (coursesData || []).map(c => c.id_curso);
      setCourses(coursesData || []);

      if (courseIds.length === 0) {
        setLoading(false);
        return;
      }

      const [enrollRes, deliveriesRes, gradesRes] = await Promise.all([
        supabase.from('inscripciones').select('id_inscripcion', { count: 'exact' }).in('id_curso', courseIds),
        supabase.from('entregas').select('id_entrega', { count: 'exact' }).in('id_curso', courseIds),
        supabase.from('calificaciones').select('nota_obtenida').in('id_curso', courseIds),
      ]);

      const totalStudents = enrollRes.count || 0;
      const totalDeliveries = deliveriesRes.count || 0;
      const gradedDeliveries = (gradesRes.data || []).filter(g => g.nota_obtenida !== null).length;
      const pendingGrades = totalDeliveries - gradedDeliveries;

      const grades = (gradesRes.data || []).filter(g => g.nota_obtenida !== null).map(g => g.nota_obtenida);
      const avgGrade = grades.length > 0
        ? parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1))
        : 0;

      setStats({
        totalStudents,
        totalCourses: courseIds.length,
        totalTasks: 0,
        totalDeliveries,
        gradedDeliveries,
        pendingGrades,
        avgGrade,
        completionRate: totalDeliveries > 0 ? Math.round((gradedDeliveries / totalDeliveries) * 100) : 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data } = await supabase
        .from('cursos')
        .select('id_curso, nombre_curso, categoria')
        .eq('id_docente', usuarioId)
        .order('nombre_curso');

      setCourses(data || []);
      if (data && data.length > 0 && !courseId) {
        setSelectedCourse(data[0].id_curso);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchCourseStats = async () => {
    if (!selectedCourse) return;

    try {
      const { data: units } = await supabase
        .from('unidades')
        .select('id_unidad')
        .eq('id_curso', selectedCourse);

      const unitIds = (units || []).map(u => u.id_unidad);

      const [studentsRes, tasksRes, quizzesRes, gradesRes, activitiesRes] = await Promise.all([
        supabase.from('inscripciones').select('id_estudiante').eq('id_curso', selectedCourse),
        unitIds.length > 0 ? supabase.from('tareas').select('id_tarea').in('id_unidad', unitIds) : { data: [] },
        unitIds.length > 0 ? supabase.from('cuestionarios').select('id_cuestionario').in('id_unidad', unitIds) : { data: [] },
        supabase.from('calificaciones').select('nota_obtenida').eq('id_curso', selectedCourse),
        supabase.from('materiales').select('id_material', { count: 'exact' }).in('id_unidad', unitIds),
      ]);

      const taskIds = (tasksRes.data || []).map(t => t.id_tarea);
      const quizIds = (quizzesRes?.data || []).map(q => q.id_cuestionario);

      let studentDeliveries = [];
      if (taskIds.length > 0) {
        const { data } = await supabase.from('entregas').select('calificacion').in('id_tarea', taskIds);
        studentDeliveries = data || [];
      }

      const grades = (gradesRes.data || []).filter(g => g.nota_obtenida !== null).map(g => g.nota_obtenida);
      const avgGrade = grades.length > 0
        ? parseFloat((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1))
        : 0;

      const distribution = [0, 0, 0, 0, 0];
      grades.forEach(g => {
        if (g < 20) distribution[0]++;
        else if (g < 40) distribution[1]++;
        else if (g < 60) distribution[2]++;
        else if (g < 80) distribution[3]++;
        else distribution[4]++;
      });

      setCourseStats({
        students: studentsRes.data?.length || 0,
        tasks: tasksRes.data?.length || 0,
        quizzes: quizIds.length,
        materials: activitiesRes.count || 0,
        deliveries: studentDeliveries.length,
        gradedDeliveries: studentDeliveries.filter(d => d.calificacion !== null).length,
        avgGrade,
      });
      setGradeDistribution(distribution);
    } catch (err) {
      console.error('Error fetching course stats:', err);
    }
  };

  if (loading) {
    return <div className="ts-loading">Cargando estadísticas...</div>;
  }

  return (
    <div className="ts-container">
      <h2 className="ts-title">Estadísticas del Docente</h2>

      <div className="ts-overview">
        <div className="ts-stat-card">
          <span className="ts-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </span>
          <div className="ts-stat-info">
            <span className="ts-stat-value">{stats.totalCourses}</span>
            <span className="ts-stat-label">Cursos</span>
          </div>
        </div>
        <div className="ts-stat-card">
          <span className="ts-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </span>
          <div className="ts-stat-info">
            <span className="ts-stat-value">{stats.totalStudents}</span>
            <span className="ts-stat-label">Estudiantes</span>
          </div>
        </div>
        <div className="ts-stat-card">
          <span className="ts-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </span>
          <div className="ts-stat-info">
            <span className="ts-stat-value">{stats.totalDeliveries}</span>
            <span className="ts-stat-label">Entregas</span>
          </div>
        </div>
        <div className="ts-stat-card">
          <span className="ts-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </span>
          <div className="ts-stat-info">
            <span className="ts-stat-value">{stats.pendingGrades}</span>
            <span className="ts-stat-label">Sin calificar</span>
          </div>
        </div>
        <div className="ts-stat-card">
          <span className="ts-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
          </span>
          <div className="ts-stat-info">
            <span className="ts-stat-value">{stats.avgGrade}</span>
            <span className="ts-stat-label">Promedio</span>
          </div>
        </div>
        <div className="ts-stat-card">
          <span className="ts-stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
          </span>
          <div className="ts-stat-info">
            <span className="ts-stat-value">{stats.completionRate}%</span>
            <span className="ts-stat-label">Calificadas</span>
          </div>
        </div>
      </div>

      {courses.length > 0 && (
        <div className="ts-course-section">
          <h3>Estadísticas por Curso</h3>
          <select
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(Number(e.target.value))}
            className="ts-course-select"
          >
            {courses.map(c => (
              <option key={c.id_curso} value={c.id_curso}>{c.nombre_curso}</option>
            ))}
          </select>

          {courseStats && (
            <div className="ts-course-stats">
              <div className="ts-course-grid">
                <div className="ts-cstat">
                  <span className="ts-cstat-value">{courseStats.students}</span>
                  <span className="ts-cstat-label">Estudiantes inscritos</span>
                </div>
                <div className="ts-cstat">
                  <span className="ts-cstat-value">{courseStats.materials}</span>
                  <span className="ts-cstat-label">Materiales</span>
                </div>
                <div className="ts-cstat">
                  <span className="ts-cstat-value">{courseStats.tasks}</span>
                  <span className="ts-cstat-label">Tareas</span>
                </div>
                <div className="ts-cstat">
                  <span className="ts-cstat-value">{courseStats.quizzes}</span>
                  <span className="ts-cstat-label">Cuestionarios</span>
                </div>
                <div className="ts-cstat">
                  <span className="ts-cstat-value">{courseStats.deliveries}</span>
                  <span className="ts-cstat-label">Entregas totales</span>
                </div>
                <div className="ts-cstat">
                  <span className="ts-cstat-value">{courseStats.avgGrade}</span>
                  <span className="ts-cstat-label">Promedio del curso</span>
                </div>
              </div>

              <div className="ts-distribution">
                <h4>Distribución de Calificaciones</h4>
                <div className="ts-bars">
                  {gradeDistribution.map((count, idx) => {
                    const labels = ['0-19', '20-39', '40-59', '60-79', '80-100'];
                    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
                    const max = Math.max(...gradeDistribution, 1);
                    return (
                      <div key={idx} className="ts-bar-item">
                        <span className="ts-bar-label">{labels[idx]}</span>
                        <div className="ts-bar-bg">
                          <div
                            className="ts-bar-fill"
                            style={{ width: `${(count / max) * 100}%`, backgroundColor: colors[idx] }}
                          ></div>
                        </div>
                        <span className="ts-bar-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        .ts-container { padding: 0; max-width: 100%; margin: 0 auto; }
        .ts-loading { display: flex; justify-content: center; align-items: center; min-height: 400px; color: var(--text-secondary); }
        .ts-title { font-size: 24px; color: var(--text-primary); margin: 0 0 24px 0; font-family: 'Outfit', sans-serif; }
        .ts-overview { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .ts-stat-card { background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-default); padding: 16px; display: flex; align-items: center; gap: 12px; }
        .ts-stat-icon { font-size: 24px; }
        .ts-stat-info { display: flex; flex-direction: column; }
        .ts-stat-value { font-size: 24px; font-weight: 700; color: var(--text-primary); font-family: 'Outfit', sans-serif; }
        .ts-stat-label { font-size: 12px; color: var(--text-secondary); }
        .ts-course-section { background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-default); padding: 24px; }
        .ts-course-section h3 { font-size: 18px; color: var(--text-primary); margin: 0 0 16px 0; font-family: 'Outfit', sans-serif; }
        .ts-course-select { width: 100%; padding: 12px; border: 1px solid var(--border-default); border-radius: 12px; font-size: 14px; margin-bottom: 20px; }
        .ts-course-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .ts-cstat { text-align: center; padding: 16px; background: var(--bg-subtle); border-radius: 12px; }
        .ts-cstat-value { font-size: 28px; font-weight: 700; color: var(--accent); display: block; }
        .ts-cstat-label { font-size: 12px; color: var(--text-secondary); }
        .ts-distribution h4 { font-size: 14px; color: var(--text-primary); margin: 0 0 16px 0; font-family: 'Outfit', sans-serif; }
        .ts-bars { display: flex; flex-direction: column; gap: 12px; }
        .ts-bar-item { display: flex; align-items: center; gap: 12px; }
        .ts-bar-label { font-size: 12px; color: var(--text-secondary); width: 50px; flex-shrink: 0; }
        .ts-bar-bg { flex: 1; height: 20px; background: var(--bg-subtle); border-radius: 4px; overflow: hidden; }
        .ts-bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }
        .ts-bar-count { font-size: 12px; font-weight: 600; color: var(--text-primary); width: 24px; text-align: right; }
        @media (max-width: 768px) {
          .ts-container { padding: 16px; }
          .ts-overview { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
};

export default TeacherStats;
