import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const RevisionEntregas = () => {
  const { taskId } = useParams();
  const { user } = useContext(AuthContext);
  const [task, setTask] = useState(null);
  const [unit, setUnit] = useState(null);
  const [course, setCourse] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [gradeValue, setGradeValue] = useState('');
  const [nota, setNota] = useState('');
  const [showGradingPanel, setShowGradingPanel] = useState(false);

  useEffect(() => {
    fetchTaskAndDeliveries();
  }, [taskId]);

  const fetchTaskAndDeliveries = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tareas')
        .select('*')
        .eq('id_tarea', taskId)
        .maybeSingle();

      if (taskError) throw taskError;
      if (!taskData) { setLoading(false); return; }
      setTask(taskData);

      if (taskData.id_unidad) {
        const { data: unitData } = await supabase
          .from('unidades')
          .select('*')
          .eq('id_unidad', taskData.id_unidad)
          .maybeSingle();

        if (unitData) {
          setUnit(unitData);
          const { data: courseData } = await supabase
            .from('cursos')
            .select('*')
            .eq('id_curso', unitData.id_curso)
            .maybeSingle();
          if (courseData) setCourse(courseData);
        }
      }

      const { data: deliveriesData, error: deliveriesError } = await supabase
        .from('entregas')
        .select('*')
        .eq('id_tarea', taskId)
        .order('fecha_entrega', { ascending: false });

      if (deliveriesError) throw deliveriesError;

      const rawDeliveries = deliveriesData || [];
      setDeliveries(rawDeliveries);

      if (rawDeliveries.length > 0) {
        const studentIds = [...new Set(rawDeliveries.map(d => d.id_estudiante).filter(Boolean))];
        if (studentIds.length > 0) {
          const { data: studentsData } = await supabase
            .from('usuarios')
            .select('id_usuario, nombre, email')
            .in('id_usuario', studentIds);

          if (studentsData) {
            const studentMap = {};
            studentsData.forEach(s => { studentMap[s.id_usuario] = s; });
            const enrichedDeliveries = rawDeliveries.map(d => ({
              ...d,
              usuarios: studentMap[d.id_estudiante] || null,
            }));
            setDeliveries(enrichedDeliveries);
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openGrading = (delivery) => {
    setSelectedDelivery(delivery);
    setGradeValue(delivery.calificacion !== null ? String(delivery.calificacion) : '');
    setNota(delivery.nota_docente || '');
    setShowGradingPanel(true);
  };

  const closeGrading = () => {
    setShowGradingPanel(false);
    setSelectedDelivery(null);
    setGradeValue('');
    setNota('');
  };

  const handleSaveGrade = async () => {
    if (!selectedDelivery) return;
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
      const updateData = { calificacion: grade };
      if (nota.trim()) {
        updateData.nota_docente = nota.trim();
      }

      const { error: updateError } = await supabase
        .from('entregas')
        .update(updateData)
        .eq('id_entrega', selectedDelivery.id_entrega);

      if (updateError) throw updateError;

      const { data: existingCalificacion } = await supabase
        .from('calificaciones')
        .select('id_calificacion')
        .eq('id_estudiante', selectedDelivery.id_estudiante)
        .eq('id_curso', course?.id_curso)
        .eq('tipo_referencia', 'tarea')
        .eq('id_referencia', taskId)
        .maybeSingle();

      const calificacionData = {
        id_estudiante: selectedDelivery.id_estudiante,
        id_curso: course?.id_curso,
        tipo_referencia: 'tarea',
        id_referencia: taskId,
        nota_obtenida: grade,
        fecha_calificacion: new Date().toISOString(),
        nombre_actividad: task?.titulo_tarea || null,
      };

      if (existingCalificacion) {
        const { error: calUpdateError } = await supabase
          .from('calificaciones')
          .update(calificacionData)
          .eq('id_calificacion', existingCalificacion.id_calificacion);
        if (calUpdateError) throw calUpdateError;
      } else {
        const { error: calInsertError } = await supabase
          .from('calificaciones')
          .insert([calificacionData]);
        if (calInsertError) throw calInsertError;
      }

      setSuccess('Calificación guardada correctamente');
      closeGrading();
      fetchTaskAndDeliveries();
    } catch (err) {
      setError(err.message || 'Error al guardar la calificación');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="re-loading">Cargando entregas...</div>;
  if (!task) {
    return (
      <div className="re-not-found">
        <h2>Tarea no encontrada</h2>
        <Link to="/docente/my-courses" className="re-btn-back">Volver a mis cursos</Link>
      </div>
    );
  }

  return (
    <div className="re-container">
      {error && <div className="re-error">{error}</div>}
      {success && <div className="re-success">{success}</div>}

      <div className="re-header">
        <Link to={`/course/${course?.id_curso || ''}`} className="re-btn-back">
          &larr; Volver al curso
        </Link>
        <div className="re-header-content">
          <h1>Revisión de Entregas</h1>
          <h2>{task.titulo_tarea}</h2>
          {unit && <p className="re-unit-name">Unidad {unit.orden}: {unit.nombre_unidad}</p>}
          {course && <p className="re-course-name">{course.nombre_curso}</p>}
          <div className="re-task-info">
            <span className="re-deadline">Fecha límite: {new Date(task.fecha_limite).toLocaleDateString('es-ES')}</span>
            <span className="re-total">Total entregas: {deliveries.length}</span>
          </div>
        </div>
      </div>

      {task.instrucciones && (
        <div className="re-instructions-card">
          <h3>Instrucciones de la Tarea</h3>
          <p>{task.instrucciones}</p>
          {task.criterios && (
            <>
              <h4>Criterios de Evaluación</h4>
              <p>{task.criterios}</p>
            </>
          )}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="re-empty">
          <p>No hay entregas para esta tarea aún.</p>
        </div>
      ) : (
        <div className="re-deliveries-grid">
          {deliveries.map((delivery) => (
            <div key={delivery.id_entrega} className={`re-delivery-card ${delivery.calificacion !== null ? 're-graded' : 're-pending'}`}>
              <div className="re-card-header">
                <div className="re-student-avatar">
                  {(delivery.usuarios?.nombre || 'E').charAt(0).toUpperCase()}
                </div>
                <div className="re-student-info">
                  <h4>{delivery.usuarios?.nombre || 'Estudiante'}</h4>
                  <span className="re-student-email">{delivery.usuarios?.email || ''}</span>
                </div>
                <div className={`re-status-badge ${delivery.calificacion !== null ? 're-graded-badge' : 're-pending-badge'}`}>
                  {delivery.calificacion !== null ? `${delivery.calificacion}/100` : 'Pendiente'}
                </div>
              </div>

              <div className="re-card-body">
                <div className="re-evidence-section">
                  <h5>Evidencia del estudiante:</h5>
                  <div className="re-evidence-content">
                    {delivery.evidencia ? (
                      delivery.evidencia.startsWith('http://') || delivery.evidencia.startsWith('https://') ? (
                        <a href={delivery.evidencia} target="_blank" rel="noopener noreferrer" className="re-evidence-link">
                          Abrir enlace de evidencia
                          <span className="re-link-icon">&#8599;</span>
                        </a>
                      ) : (
                        <p className="re-evidence-text">{delivery.evidencia}</p>
                      )
                    ) : (
                      <p className="re-evidence-empty">Sin evidencia</p>
                    )}
                  </div>
                </div>

                <div className="re-delivery-meta">
                  <span className="re-delivery-date">
                    Entregado: {new Date(delivery.fecha_entrega).toLocaleString('es-ES')}
                  </span>
                  {delivery.nota_docente && (
                    <span className="re-delivery-note">
                      Nota: {delivery.nota_docente}
                    </span>
                  )}
                </div>
              </div>

              <div className="re-card-actions">
                <button className="re-btn-review" onClick={() => openGrading(delivery)}>
                  {delivery.calificacion !== null ? 'Editar Calificación' : 'Calificar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showGradingPanel && selectedDelivery && (
        <div className="re-grading-overlay" onClick={closeGrading}>
          <div className="re-grading-panel" onClick={(e) => e.stopPropagation()}>
            <div className="re-grading-header">
              <h2>Calificar Entrega</h2>
              <button className="re-grading-close" onClick={closeGrading}>&times;</button>
            </div>

            <div className="re-grading-student">
              <div className="re-student-avatar re-avatar-large">
                {(selectedDelivery.usuarios?.nombre || 'E').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3>{selectedDelivery.usuarios?.nombre || 'Estudiante'}</h3>
                <p>{selectedDelivery.usuarios?.email || ''}</p>
                <span className="re-grading-date">
                  Entregado: {new Date(selectedDelivery.fecha_entrega).toLocaleString('es-ES')}
                </span>
              </div>
            </div>

            <div className="re-grading-evidence">
              <h4>Evidencia del Estudiante</h4>
              <div className="re-grading-evidence-content">
                {selectedDelivery.evidencia ? (
                  selectedDelivery.evidencia.startsWith('http://') || selectedDelivery.evidencia.startsWith('https://') ? (
                    <a href={selectedDelivery.evidencia} target="_blank" rel="noopener noreferrer" className="re-evidence-link">
                      Abrir enlace de evidencia
                      <span className="re-link-icon">&#8599;</span>
                    </a>
                  ) : (
                    <p className="re-evidence-text">{selectedDelivery.evidencia}</p>
                  )
                ) : (
                  <p className="re-evidence-empty">Sin evidencia</p>
                )}
              </div>
            </div>

            <div className="re-grading-form">
              <div className="re-grade-section">
                <label>Calificación (0-100) *</label>
                <input
                  type="number"
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  className="re-grade-input-large"
                  min="0"
                  max="100"
                  placeholder="0-100"
                />
              </div>

              <div className="re-note-section">
                <label>Nota o comentario (opcional)</label>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className="re-note-input"
                  placeholder="Escribe un comentario o nota para el estudiante..."
                  rows="4"
                />
              </div>

              <div className="re-grading-actions">
                <button className="re-btn-cancel-large" onClick={closeGrading}>Cancelar</button>
                <button className="re-btn-save-large" onClick={handleSaveGrade} disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar Calificación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .re-container { padding: 0; max-width: 100%; margin: 0 auto; }
        .re-loading { display: flex; justify-content: center; align-items: center; min-height: 400px; font-size: 18px; color: var(--text-secondary); }
        .re-not-found { text-align: center; padding: 60px 20px; }
        .re-not-found h2 { color: var(--text-primary); margin-bottom: 16px; font-family: 'Outfit', sans-serif; }
        .re-error { background: var(--danger-subtle); color: var(--danger); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; }
        .re-success { background: var(--success-subtle); color: var(--success); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; }
        .re-header { margin-bottom: 24px; }
        .re-btn-back { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 500; display: inline-block; margin-bottom: 12px; }
        .re-btn-back:hover { text-decoration: underline; }
        .re-header-content h1 { font-size: 24px; color: var(--text-primary); margin: 0 0 4px 0; font-family: 'Outfit', sans-serif; }
        .re-header-content h2 { font-size: 20px; color: var(--text-primary); margin: 0 0 8px 0; font-weight: 500; font-family: 'Outfit', sans-serif; }
        .re-unit-name { color: var(--text-secondary); margin: 0 0 4px 0; font-size: 14px; }
        .re-course-name { color: var(--accent); margin: 0 0 12px 0; font-size: 14px; font-weight: 500; }
        .re-task-info { display: flex; gap: 16px; flex-wrap: wrap; }
        .re-deadline { font-size: 13px; color: var(--text-secondary); }
        .re-total { font-size: 13px; color: var(--text-secondary); font-weight: 500; }

        .re-instructions-card { background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: 20px; padding: 20px; margin-bottom: 24px; }
        .re-instructions-card h3 { font-size: 16px; color: var(--text-primary); margin: 0 0 8px 0; font-family: 'Outfit', sans-serif; }
        .re-instructions-card p { color: var(--text-secondary); font-size: 14px; line-height: 1.6; margin: 0 0 12px 0; }
        .re-instructions-card h4 { font-size: 14px; color: var(--text-primary); margin: 12px 0 6px 0; font-family: 'Outfit', sans-serif; }

        .re-empty { text-align: center; padding: 40px; background: var(--bg-subtle); border-radius: 20px; border: 1px dashed var(--border-default); }
        .re-empty p { color: var(--text-tertiary); margin: 0; font-size: 15px; }

        .re-deliveries-grid { display: flex; flex-direction: column; gap: 16px; }
        .re-delivery-card { background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-default); overflow: hidden; transition: box-shadow 0.2s; }
        .re-delivery-card:hover { box-shadow: var(--shadow-outset-sm); }
        .re-delivery-card.re-graded { border-left: 4px solid var(--success); }
        .re-delivery-card.re-pending { border-left: 4px solid var(--warning); }

        .re-card-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid var(--bg-subtle); }
        .re-student-avatar { width: 42px; height: 42px; border-radius: 50%; background: var(--accent); color: var(--bg-surface); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 600; flex-shrink: 0; }
        .re-student-info h4 { margin: 0; font-size: 15px; color: var(--text-primary); font-family: 'Outfit', sans-serif; }
        .re-student-email { font-size: 12px; color: var(--text-tertiary); }
        .re-status-badge { margin-left: auto; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; white-space: nowrap; }
        .re-graded-badge { background: var(--success-subtle); color: var(--success); }
        .re-pending-badge { background: var(--warning-subtle); color: var(--warning); }

        .re-card-body { padding: 16px 20px; }
        .re-evidence-section h5 { font-size: 13px; color: var(--text-secondary); margin: 0 0 8px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .re-evidence-content { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 12px; padding: 12px; }
        .re-evidence-text { color: var(--text-primary); font-size: 14px; line-height: 1.6; margin: 0; white-space: pre-wrap; word-break: break-word; }
        .re-evidence-empty { color: var(--text-tertiary); font-size: 13px; font-style: italic; margin: 0; }
        .re-evidence-link { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }
        .re-evidence-link:hover { text-decoration: underline; }
        .re-link-icon { font-size: 16px; }

        .re-delivery-meta { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--bg-subtle); }
        .re-delivery-date { font-size: 12px; color: var(--text-tertiary); }
        .re-delivery-note { font-size: 12px; color: var(--accent); font-style: italic; }

        .re-card-actions { padding: 12px 20px; border-top: 1px solid var(--bg-subtle); display: flex; justify-content: flex-end; }
        .re-btn-review { background: var(--accent); color: var(--bg-surface); border: none; padding: 8px 20px; border-radius: 12px; font-size: 13px; cursor: pointer; font-weight: 500; transition: background 0.2s; }
        .re-btn-review:hover { background: var(--accent); }

        .re-grading-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
        .re-grading-panel { background: var(--bg-surface); border-radius: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-outset); }
        .re-grading-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border-default); }
        .re-grading-header h2 { font-size: 20px; color: var(--text-primary); margin: 0; font-family: 'Outfit', sans-serif; }
        .re-grading-close { background: none; border: none; font-size: 28px; cursor: pointer; color: var(--text-secondary); padding: 0 4px; line-height: 1; }
        .re-grading-close:hover { color: var(--text-primary); }

        .re-grading-student { display: flex; align-items: center; gap: 16px; padding: 20px 24px; border-bottom: 1px solid var(--bg-subtle); }
        .re-avatar-large { width: 56px; height: 56px; font-size: 24px; }
        .re-grading-student h3 { font-size: 18px; color: var(--text-primary); margin: 0 0 2px 0; font-family: 'Outfit', sans-serif; }
        .re-grading-student p { font-size: 13px; color: var(--text-tertiary); margin: 0; }
        .re-grading-date { font-size: 12px; color: var(--text-secondary); }

        .re-grading-evidence { padding: 20px 24px; border-bottom: 1px solid var(--bg-subtle); }
        .re-grading-evidence h4 { font-size: 14px; color: var(--text-primary); margin: 0 0 10px 0; font-family: 'Outfit', sans-serif; }
        .re-grading-evidence-content { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 12px; padding: 16px; }

        .re-grading-form { padding: 20px 24px; }
        .re-grade-section { margin-bottom: 16px; }
        .re-grade-section label { display: block; font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
        .re-grade-input-large { width: 120px; padding: 10px 14px; border: 2px solid var(--border-default); border-radius: 12px; font-size: 18px; font-weight: 600; outline: none; transition: border-color 0.2s; }
        .re-grade-input-large:focus { border-color: var(--accent); }

        .re-note-section { margin-bottom: 20px; }
        .re-note-section label { display: block; font-size: 14px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
        .re-note-section label::after { content: ' (opcional)'; color: var(--text-tertiary); font-weight: 400; }
        .re-note-input { width: 100%; padding: 12px; border: 1px solid var(--border-default); border-radius: 12px; font-size: 14px; outline: none; box-sizing: border-box; transition: border-color 0.2s; font-family: inherit; resize: vertical; }
        .re-note-input:focus { border-color: var(--accent); }

        .re-grading-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .re-btn-cancel-large { background: var(--bg-subtle); color: var(--text-primary); border: 1px solid var(--border-default); padding: 10px 20px; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 500; }
        .re-btn-cancel-large:hover { background: var(--border-default); }
        .re-btn-save-large { background: var(--success); color: var(--bg-surface); border: none; padding: 10px 24px; border-radius: 12px; font-size: 14px; cursor: pointer; font-weight: 600; }
        .re-btn-save-large:hover { background: var(--success); }
        .re-btn-save-large:disabled { background: var(--success-subtle); cursor: not-allowed; }

        @media (max-width: 768px) {
          .re-container { padding: 16px; }
          .re-card-header { flex-wrap: wrap; }
          .re-status-badge { margin-left: 54px; }
          .re-grading-panel { max-width: 100%; border-radius: 20px; }
          .re-grading-student { flex-direction: column; text-align: center; }
        }
      `}</style>
    </div>
  );
};

export default RevisionEntregas;
