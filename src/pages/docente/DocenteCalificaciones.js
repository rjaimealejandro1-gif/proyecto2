import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const DocenteCalificaciones = () => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [studentsData, setStudentsData] = useState([]);
  const [gradingDelivery, setGradingDelivery] = useState(null);
  const [gradeValue, setGradeValue] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [taskDetail, setTaskDetail] = useState(null);
  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const toggleStudent = (id) => {
    setExpandedStudentId(prev => prev === id ? null : id);
  };

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId) fetchCourses();
  }, [usuarioId]);

  useEffect(() => {
    if (selectedCourse) fetchCourseData();
  }, [selectedCourse]);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cursos')
        .select('id_curso, nombre_curso, categoria, estado')
        .eq('id_docente', usuarioId)
        .order('nombre_curso', { ascending: true });
      if (fetchError) throw fetchError;
      setCourses(data || []);
      if (data && data.length > 0) setSelectedCourse(data[0].id_curso);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fetchCourseData = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: enrollments, error: enrollError } = await supabase
        .from('inscripciones')
        .select('id_estudiante')
        .eq('id_curso', selectedCourse);
      if (enrollError) throw enrollError;

      const studentIds = (enrollments || []).map(e => e.id_estudiante);
      if (studentIds.length === 0) { setStudentsData([]); setLoading(false); return; }

      const { data: students } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre, email')
        .in('id_usuario', studentIds);
      const studentMap = {};
      (students || []).forEach(s => { studentMap[s.id_usuario] = s; });

      const { data: units } = await supabase.from('unidades').select('id_unidad').eq('id_curso', selectedCourse);
      const unitIds = (units || []).map(u => u.id_unidad);
      let allTasks = [];
      let allQuizzes = [];

      if (unitIds.length > 0) {
        const { data: tasks } = await supabase.from('tareas').select('id_tarea, titulo_tarea, id_unidad').in('id_unidad', unitIds);
        allTasks = tasks || [];
        const { data: quizzes } = await supabase.from('cuestionarios').select('id_cuestionario, titulo_cuestionario, id_unidad').in('id_unidad', unitIds);
        allQuizzes = quizzes || [];
      }

      const taskMap = {};
      allTasks.forEach(t => { taskMap[t.id_tarea] = t.titulo_tarea; });
      const quizMap = {};
      allQuizzes.forEach(q => { quizMap[q.id_cuestionario] = q.titulo_cuestionario; });

      const taskIds = allTasks.map(t => t.id_tarea);
      const quizIds = allQuizzes.map(q => q.id_cuestionario);

      let allDeliveries = [];
      if (taskIds.length > 0) {
        const { data: deliveries } = await supabase.from('entregas').select('*').in('id_tarea', taskIds);
        allDeliveries = deliveries || [];
      }

      let allQuizGrades = [];
      if (quizIds.length > 0) {
        const { data: grades } = await supabase.from('calificaciones').select('*').eq('id_curso', selectedCourse).eq('tipo_referencia', 'cuestionario').in('id_referencia', quizIds);
        allQuizGrades = grades || [];
      }

      const studentsList = studentIds.map(sid => {
        const student = studentMap[sid] || { id_usuario: sid, nombre: 'Estudiante', email: '' };
        const studentDeliveries = allDeliveries.filter(d => d.id_estudiante === sid);
        const studentQuizGrades = allQuizGrades.filter(g => g.id_estudiante === sid);

        const activities = [];

        allTasks.forEach(task => {
          const del = studentDeliveries.find(d => d.id_tarea === task.id_tarea);
          activities.push({
            id: task.id_tarea,
            tipo: 'tarea',
            nombre: task.titulo_tarea || 'Tarea',
            nota: del ? del.calificacion : null,
            fecha: del ? del.fecha_entrega : null,
            evidencia: del ? del.evidencia : null,
            archivo_url: del ? del.archivo_url : null,
            archivo_nombre: del ? del.archivo_nombre : null,
            tipo_entrega: del ? del.tipo_entrega : null,
            nota_docente: del ? del.nota_docente : null,
            deliveryId: del ? del.id_entrega : null,
            entregado: !!del,
          });
        });

        allQuizzes.forEach(quiz => {
          const qg = studentQuizGrades.find(g => g.id_referencia === quiz.id_cuestionario);
          activities.push({
            id: quiz.id_cuestionario,
            tipo: 'cuestionario',
            nombre: quiz.titulo_cuestionario || 'Cuestionario',
            nota: qg ? qg.nota_obtenida : null,
            fecha: qg ? qg.fecha_calificacion : null,
            entregado: !!qg,
          });
        });

        const gradedActivities = activities.filter(a => a.nota !== null);
        const average = gradedActivities.length > 0
          ? parseFloat((gradedActivities.reduce((sum, a) => sum + (a.nota || 0), 0) / gradedActivities.length).toFixed(1))
          : null;

        return { id: sid, nombre: student.nombre, email: student.email, activities, average };
      });

      setStudentsData(studentsList);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openGrading = async (studentId, activity) => {
    setGradingDelivery({ studentId, ...activity });
    setGradeValue(activity.nota !== null ? String(activity.nota) : '');
    setNota(activity.nota_docente || '');
    setTaskDetail(null);

    if (activity.tipo === 'tarea') {
      setTaskDetail({ 
        evidencia: activity.evidencia, 
        archivo_url: activity.archivo_url,
        archivo_nombre: activity.archivo_nombre,
        tipo_entrega: activity.tipo_entrega,
        nota_docente: activity.nota_docente 
      });
    }
  };

  const closeGrading = () => {
    setGradingDelivery(null);
    setGradeValue('');
    setNota('');
    setTaskDetail(null);
  };

  const handleSaveGrade = async () => {
    if (!gradingDelivery) return;
    setError(null);
    setSuccess(null);

    if (gradeValue === '' || gradeValue === null) {
      setError('La calificación es obligatoria');
      return;
    }

    const grade = parseInt(gradeValue, 10);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      setError('La calificación debe estar entre 0 y 100');
      return;
    }

    setSaving(true);
    try {
      if (gradingDelivery.tipo === 'tarea') {
        const updateData = { calificacion: grade };
        if (nota.trim()) updateData.nota_docente = nota.trim();

        if (gradingDelivery.deliveryId) {
          const { error: updateError } = await supabase
            .from('entregas')
            .update(updateData)
            .eq('id_entrega', gradingDelivery.deliveryId);
          if (updateError) throw updateError;
        }

        const { data: existing } = await supabase
          .from('calificaciones')
          .select('id_calificacion')
          .eq('id_estudiante', gradingDelivery.studentId)
          .eq('id_curso', selectedCourse)
          .eq('tipo_referencia', 'tarea')
          .eq('id_referencia', gradingDelivery.id)
          .maybeSingle();

        const calData = {
          id_estudiante: gradingDelivery.studentId,
          id_curso: selectedCourse,
          tipo_referencia: 'tarea',
          id_referencia: gradingDelivery.id,
          nota_obtenida: grade,
          fecha_calificacion: new Date().toISOString(),
          nombre_actividad: gradingDelivery.nombre || null,
        };

        if (existing) {
          await supabase.from('calificaciones').update(calData).eq('id_calificacion', existing.id_calificacion);
        } else {
          await supabase.from('calificaciones').insert([calData]);
        }
      } else {
        const { data: existing } = await supabase
          .from('calificaciones')
          .select('id_calificacion')
          .eq('id_calificacion', gradingDelivery.id)
          .maybeSingle();

        const calData = {
          id_estudiante: gradingDelivery.studentId,
          id_curso: selectedCourse,
          tipo_referencia: 'cuestionario',
          id_referencia: gradingDelivery.id_referencia,
          nota_obtenida: grade,
          fecha_calificacion: new Date().toISOString(),
          nombre_actividad: gradingDelivery.nombre || null,
        };

        if (existing) {
          await supabase.from('calificaciones').update(calData).eq('id_calificacion', existing.id_calificacion);
        } else {
          await supabase.from('calificaciones').insert([calData]);
        }
      }

      setSuccess('Calificación guardada correctamente');
      closeGrading();
      fetchCourseData();
    } catch (err) { setError(err.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const selectedCourseData = courses.find(c => c.id_curso === selectedCourse);

  if (loading && courses.length === 0) return <div className="dc-loading">Cargando calificaciones...</div>;

  return (
    <div className="dc-container">
      <div className="dc-header">
        <div>
          <h1>Calificaciones</h1>
          <p>Gestiona las calificaciones de tus cursos</p>
        </div>
      </div>

      {error && <div className="dc-error">{error}</div>}
      {success && <div className="dc-success">{success}</div>}

      <div className="dc-filters">
        <div className="dc-filter-group">
          <label>Curso</label>
          <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)} className="dc-select">
            <option value="">Seleccionar curso</option>
            {courses.map(c => (
              <option key={c.id_curso} value={c.id_curso}>{c.nombre_curso}</option>
            ))}
          </select>
        </div>
        {selectedCourseData && (
          <div className="dc-course-info">
            <span className="dc-course-name">{selectedCourseData.nombre_curso}</span>
            <span className="dc-course-cat">{selectedCourseData.categoria}</span>
          </div>
        )}
      </div>

      {!selectedCourse ? (
        <div className="dc-empty"><p>Selecciona un curso para ver las calificaciones.</p></div>
      ) : loading ? (
        <div className="dc-loading">Cargando datos...</div>
      ) : studentsData.length === 0 ? (
        <div className="dc-empty"><p>No hay estudiantes inscritos en este curso.</p></div>
      ) : (
        <div className="dc-students">
          {studentsData.map(student => (
            <div key={student.id} className="dc-student-card">
              <div 
                className={`dc-student-header ${expandedStudentId === student.id ? 'dc-expanded' : ''}`} 
                onClick={() => toggleStudent(student.id)}
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                <div className="dc-student-info">
                  <div className="dc-student-avatar">{(student.nombre || 'E').charAt(0).toUpperCase()}</div>
                  <div>
                    <h3 className="dc-student-name-hover">{student.nombre} <span className="dc-expand-hint">(Clic para ver detalles)</span></h3>
                    <p className="dc-student-email">{student.email}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  {student.average !== null ? (
                    <div className={`dc-student-avg-badge ${student.average >= 60 ? 'dc-avg-pass' : 'dc-avg-fail'}`}>
                      {student.average}
                    </div>
                  ) : (
                    <div className="dc-student-avg-badge dc-avg-none">--</div>
                  )}
                  <div className="dc-expand-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: expandedStudentId === student.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-tertiary)' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </div>
              </div>

              {expandedStudentId === student.id && (
                <div className="dc-student-details-panel">
                  {student.activities.length === 0 ? (
                    <p className="dc-no-activities">Sin actividades</p>
                  ) : (
                    <div className="dc-activities-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Actividad</th>
                            <th>Tipo</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                            <th>Nota</th>
                            <th>Acciones</th>
                          </tr>
                        </thead>
                        <tbody>
                          {student.activities.map((activity, idx) => (
                            <tr key={`${activity.id}-${idx}`} className={activity.nota === null ? 'dc-row-pending' : ''}>
                              <td className="dc-activity-name">{activity.nombre}</td>
                              <td>
                                <span className={`dc-type-badge ${activity.tipo === 'tarea' ? 'dc-type-tarea' : 'dc-type-cuestionario'}`}>
                                  {activity.tipo === 'tarea' ? 'Tarea' : 'Examen/Cuestionario'}
                                </span>
                              </td>
                              <td className="dc-activity-date">
                                {activity.fecha ? new Date(activity.fecha).toLocaleDateString('es-ES') : '--'}
                              </td>
                              <td>
                                {activity.nota !== null ? (
                                  <span className="dc-status-graded">Presentado / Calificado</span>
                                ) : activity.entregado ? (
                                  <span className="dc-status-pending" style={{color: 'var(--warning)'}}>Entregado (Pdte.)</span>
                                ) : (
                                  <span className="dc-status-pending" style={{color: 'var(--text-tertiary)'}}>No entregado</span>
                                )}
                              </td>
                              <td className="dc-activity-grade">
                                {activity.nota !== null ? (
                                  <span className={`dc-grade-num ${activity.nota >= 60 ? 'dc-grade-pass' : 'dc-grade-fail'}`}>
                                    {activity.nota}/100
                                  </span>
                                ) : (
                                  <span className="dc-grade-none">--</span>
                                )}
                              </td>
                              <td>
                                {activity.tipo === 'tarea' ? (
                                  <button className="dc-btn-grade" onClick={() => openGrading(student.id, activity)}>
                                    {activity.nota !== null ? 'Editar' : 'Calificar'}
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Auto-calificado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {gradingDelivery && (
        <div className="dc-grading-overlay" onClick={closeGrading}>
          <div className="dc-grading-panel" onClick={e => e.stopPropagation()}>
            <div className="dc-grading-header">
              <h2>{gradingDelivery.nota !== null ? 'Editar' : 'Asignar'} Calificación</h2>
              <button className="dc-grading-close" onClick={closeGrading}>&times;</button>
            </div>

            <div className="dc-grading-info">
              <div className="dc-grading-activity">
                <span className={`dc-type-badge ${gradingDelivery.tipo === 'tarea' ? 'dc-type-tarea' : 'dc-type-cuestionario'}`}>
                  {gradingDelivery.tipo === 'tarea' ? 'Tarea' : 'Cuestionario'}
                </span>
                <h3>{gradingDelivery.nombre}</h3>
              </div>

              {gradingDelivery.tipo === 'tarea' && taskDetail && (
                <div className="dc-grading-evidence">
                  <h4>Evidencia del estudiante:</h4>
                  
                  {taskDetail.tipo_entrega === 'archivo' && taskDetail.archivo_url ? (
                    <div className="dc-evidence-file" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{color: 'var(--accent)'}}>
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                      </svg>
                      <a href={taskDetail.archivo_url} target="_blank" rel="noopener noreferrer" className="dc-evidence-link">
                        Ver / Descargar: {taskDetail.archivo_nombre || 'Archivo adjunto'} &#8599;
                      </a>
                    </div>
                  ) : taskDetail.tipo_entrega === 'enlace' || taskDetail.tipo_entrega === 'video' ? (
                    <div className="dc-evidence-link-box" style={{ padding: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px' }}>
                      <a href={taskDetail.evidencia} target="_blank" rel="noopener noreferrer" className="dc-evidence-link" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        Abrir {taskDetail.tipo_entrega === 'video' ? 'Video' : 'Enlace adjunto'} &#8599;
                      </a>
                    </div>
                  ) : taskDetail.evidencia ? (
                    <p className="dc-evidence-text" style={{ padding: '12px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {taskDetail.evidencia}
                    </p>
                  ) : (
                    <p className="dc-no-evidence" style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>El estudiante no subió evidencia.</p>
                  )}
                </div>
              )}

              {taskDetail?.nota_docente && (
                <div className="dc-grading-prev-note">
                  <h4>Nota anterior:</h4>
                  <p>{taskDetail.nota_docente}</p>
                </div>
              )}
            </div>

            <div className="dc-grading-form">
              <div className="dc-grade-input-group">
                <label>Calificación (0-100) *</label>
                <input
                  type="number"
                  value={gradeValue}
                  onChange={e => setGradeValue(e.target.value)}
                  className="dc-grade-input"
                  min="0"
                  max="100"
                  placeholder="0-100"
                />
              </div>

              <div className="dc-note-input-group">
                <label>Comentario (opcional)</label>
                <textarea
                  value={nota}
                  onChange={e => setNota(e.target.value)}
                  className="dc-note-input"
                  placeholder="Escribe un comentario para el estudiante..."
                  rows="3"
                />
              </div>

              <div className="dc-grading-actions">
                <button className="dc-btn-cancel" onClick={closeGrading}>Cancelar</button>
                <button className="dc-btn-save" onClick={handleSaveGrade} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .dc-container { padding: 0; max-width: 100%; margin: 0 auto; }
        .dc-loading { display: flex; justify-content: center; align-items: center; min-height: 400px; font-size: 18px; color: var(--text-secondary); }
        .dc-header { margin-bottom: 24px; }
        .dc-header h1 { font-size: 28px; color: var(--text-primary); margin: 0 0 4px 0; font-family: 'Outfit', sans-serif; }
        .dc-header p { color: var(--text-secondary); margin: 0; }
        .dc-error { background: var(--danger-subtle); color: var(--danger); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; }
        .dc-success { background: var(--success-subtle); color: var(--success); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; }
        .dc-filters { display: flex; gap: 16px; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; }
        .dc-filter-group { display: flex; flex-direction: column; gap: 4px; }
        .dc-filter-group label { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .dc-select { padding: 8px 12px; border: 1px solid var(--border-default); border-radius: 12px; font-size: 14px; outline: none; background: var(--bg-surface); min-width: 200px; }
        .dc-select:focus { border-color: var(--accent); }
        .dc-course-info { margin-left: auto; display: flex; gap: 8px; align-items: center; }
        .dc-course-name { font-size: 15px; font-weight: 600; color: var(--text-primary); font-family: 'Outfit', sans-serif; }
        .dc-course-cat { font-size: 12px; color: var(--text-secondary); background: var(--bg-subtle); padding: 3px 10px; border-radius: 20px; }
        .dc-empty { text-align: center; padding: 60px 20px; background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-default); }
        .dc-empty p { color: var(--text-tertiary); font-size: 16px; margin: 0; }
        .dc-students { display: flex; flex-direction: column; gap: 16px; }
        .dc-student-card { background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-default); padding: 20px; box-shadow: var(--shadow-outset-sm); }
        .dc-student-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .dc-student-info { display: flex; align-items: center; gap: 12px; }
        .dc-student-avatar { width: 44px; height: 44px; border-radius: 50%; background: var(--accent); color: var(--bg-surface); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; }
        .dc-student-name-hover { font-size: 16px; color: var(--text-primary); margin: 0 0 2px 0; font-family: 'Outfit', sans-serif; display: flex; align-items: center; gap: 8px; }
        .dc-expand-hint { font-size: 11px; color: var(--text-tertiary); font-weight: 400; font-family: 'Inter', sans-serif; opacity: 0; transition: opacity 0.2s; }
        .dc-student-header:hover .dc-expand-hint { opacity: 1; }
        .dc-student-email { font-size: 13px; color: var(--text-secondary); margin: 0; }
        .dc-student-details-panel { border-top: 1px solid var(--border-light); margin-top: 16px; padding-top: 16px; animation: slideDown 0.2s ease-out; }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        .dc-student-avg-badge { font-size: 20px; font-weight: 700; padding: 8px 18px; border-radius: 10px; }
        .dc-avg-pass { background: var(--success-subtle); color: var(--success); }
        .dc-avg-fail { background: var(--danger-subtle); color: var(--danger); }
        .dc-avg-none { background: var(--bg-subtle); color: var(--text-tertiary); }
        .dc-no-activities { color: var(--text-tertiary); font-size: 14px; text-align: center; margin: 0; padding: 12px 0; }
        .dc-activities-table { overflow-x: auto; }
        .dc-activities-table table { width: 100%; border-collapse: collapse; }
        .dc-activities-table th { text-align: left; padding: 10px 12px; font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--bg-subtle); border-bottom: 2px solid var(--border-default); text-transform: uppercase; letter-spacing: 0.5px; }
        .dc-activities-table td { padding: 10px 12px; font-size: 14px; color: var(--text-primary); border-bottom: 1px solid var(--bg-subtle); vertical-align: middle; }
        .dc-row-pending { background: var(--warning-subtle); }
        .dc-row-pending:hover { background: var(--warning-subtle); }
        .dc-activity-name { font-weight: 500; color: var(--text-primary); font-family: 'Outfit', sans-serif; }
        .dc-activity-date { color: var(--text-secondary); font-size: 13px; }
        .dc-type-badge { font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: 600; }
        .dc-type-tarea { background: var(--info-subtle); color: var(--info); }
        .dc-type-cuestionario { background: rgba(212, 107, 107, 0.1); color: var(--danger); }
        .dc-status-graded { color: var(--success); font-size: 13px; font-weight: 500; }
        .dc-status-pending { color: var(--warning); font-size: 13px; font-weight: 500; }
        .dc-grade-num { font-weight: 700; font-size: 15px; }
        .dc-grade-pass { color: var(--success); }
        .dc-grade-fail { color: var(--danger); }
        .dc-grade-none { color: var(--border-default); }
        .dc-btn-grade { background: var(--accent); color: var(--bg-surface); border: none; padding: 6px 14px; border-radius: 10px; font-size: 12px; cursor: pointer; font-weight: 500; }
        .dc-btn-grade:hover { background: var(--accent); filter: brightness(0.9); }
        .dc-grading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .dc-grading-panel { background: var(--bg-surface); border-radius: 20px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-outset); }
        .dc-grading-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-default); }
        .dc-grading-header h2 { font-size: 18px; color: var(--text-primary); margin: 0; font-family: 'Outfit', sans-serif; }
        .dc-grading-close { background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-secondary); padding: 0 4px; }
        .dc-grading-close:hover { color: var(--text-primary); }
        .dc-grading-info { padding: 20px 24px; border-bottom: 1px solid var(--bg-subtle); }
        .dc-grading-activity { margin-bottom: 12px; }
        .dc-grading-activity h3 { font-size: 16px; color: var(--text-primary); margin: 8px 0 0 0; font-family: 'Outfit', sans-serif; }
        .dc-grading-evidence { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 12px; padding: 12px; margin-bottom: 12px; }
        .dc-grading-evidence h4 { font-size: 12px; color: var(--text-secondary); margin: 0 0 6px 0; text-transform: uppercase; }
        .dc-evidence-text { color: var(--text-primary); font-size: 14px; margin: 0; white-space: pre-wrap; word-break: break-word; }
        .dc-evidence-link { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 500; }
        .dc-evidence-link:hover { text-decoration: underline; }
        .dc-grading-prev-note { background: var(--accent-subtle); border-radius: 12px; padding: 12px; }
        .dc-grading-prev-note h4 { font-size: 12px; color: var(--accent); margin: 0 0 4px 0; }
        .dc-grading-prev-note p { font-size: 13px; color: var(--text-primary); margin: 0; }
        .dc-grading-form { padding: 20px 24px; }
        .dc-grade-input-group { margin-bottom: 16px; }
        .dc-grade-input-group label { display: block; font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 6px; }
        .dc-grade-input { width: 100px; padding: 10px 14px; border: 2px solid var(--border-default); border-radius: 12px; font-size: 18px; font-weight: 600; outline: none; }
        .dc-grade-input:focus { border-color: var(--accent); }
        .dc-note-input-group { margin-bottom: 20px; }
        .dc-note-input-group label { display: block; font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 6px; }
        .dc-note-input-group label::after { content: ' (opcional)'; color: var(--text-tertiary); font-weight: 400; }
        .dc-note-input { width: 100%; padding: 10px; border: 1px solid var(--border-default); border-radius: 12px; font-size: 14px; outline: none; box-sizing: border-box; font-family: inherit; resize: vertical; }
        .dc-note-input:focus { border-color: var(--accent); }
        .dc-grading-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .dc-btn-cancel { background: var(--bg-subtle); color: var(--text-primary); border: 1px solid var(--border-default); padding: 10px 20px; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 500; }
        .dc-btn-cancel:hover { background: var(--border-default); }
        .dc-btn-save { background: var(--success); color: var(--bg-surface); border: none; padding: 10px 24px; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 600; }
        .dc-btn-save:hover { background: var(--success); filter: brightness(0.9); }
        .dc-btn-save:disabled { background: var(--success-subtle); cursor: not-allowed; }
        @media (max-width: 768px) {
          .dc-container { padding: 16px; }
          .dc-filters { flex-direction: column; }
          .dc-course-info { margin-left: 0; }
          .dc-student-header { flex-direction: column; align-items: flex-start; gap: 8px; }
          .dc-activities-table { font-size: 12px; }
          .dc-grading-panel { max-width: 100%; border-radius: 20px; }
        }
      `}</style>
    </div>
  );
};

export default DocenteCalificaciones;
