import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { getUsuarioIdFromUser } from '../utils/userHelpers';

const CursoDetalle = () => {
  const { courseId } = useParams();
  const { user, role } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [course, setCourse] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitFormData, setUnitFormData] = useState({ titulo: '', descripcion: '', orden: 1 });
  const [unitFormErrors, setUnitFormErrors] = useState({});
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialFormData, setMaterialFormData] = useState({ titulo: '', contenido: '', tipo_material: 'texto', id_unidad: '' });
  const [materialFormErrors, setMaterialFormErrors] = useState({});
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskFormData, setTaskFormData] = useState({ titulo_tarea: '', instrucciones: '', fecha_limite: '', criterios: '', id_unidad: '' });
  const [taskFormErrors, setTaskFormErrors] = useState({});
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizFormData, setQuizFormData] = useState({ titulo_cuestionario: '', id_unidad: '' });
  const [quizFormErrors, setQuizFormErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [translations, setTranslations] = useState({});
  const [translatingId, setTranslatingId] = useState(null);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('cursos')
        .select('*')
        .eq('id_curso', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      if (courseData.id_docente) {
        const { data: teacherData, error: teacherError } = await supabase
          .from('usuarios')
          .select('nombre, email')
          .eq('id_usuario', courseData.id_docente)
          .single();

        if (!teacherError && teacherData) {
          setTeacher(teacherData);
        }
      }

      const { data: unitsData, error: unitsError } = await supabase
        .from('unidades')
        .select('*')
        .eq('id_curso', courseId)
        .order('orden', { ascending: true });

      if (unitsError) throw unitsError;

      const unitsWithContent = [];
      for (const unit of unitsData || []) {
        const { data: materials } = await supabase
          .from('materiales')
          .select('*')
          .eq('id_unidad', unit.id_unidad)
          .order('id_material', { ascending: true });

        const { data: tasks } = await supabase
          .from('tareas')
          .select('*')
          .eq('id_unidad', unit.id_unidad)
          .order('fecha_limite', { ascending: true });

        const { data: quizzes } = await supabase
          .from('cuestionarios')
          .select('*')
          .eq('id_unidad', unit.id_unidad)
          .order('id_cuestionario', { ascending: true });

        unitsWithContent.push({
          ...unit,
          materials: materials || [],
          tasks: tasks || [],
          cuestionarios: quizzes || [],
        });
      }

      setUnits(unitsWithContent);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTeacher = role === 'docente' && course && course.id_docente === usuarioId;
  const isAdmin = role === 'administrador';
  const canEdit = isTeacher || isAdmin;

  const handleTranslate = async (materialId, text) => {
    if (translations[materialId]) {
      const newTranslations = { ...translations };
      delete newTranslations[materialId];
      setTranslations(newTranslations);
      return;
    }

    setTranslatingId(materialId);
    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|en`
      );
      const data = await response.json();
      if (data.responseData) {
        setTranslations({
          ...translations,
          [materialId]: data.responseData.translatedText,
        });
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setTranslatingId(null);
    }
  };

  const renderMaterial = (material) => {
    switch (material.tipo_material) {
      case 'texto':
        return (
          <div className="cd-material-text">
            <p>{translations[material.id_material] || material.contenido}</p>
            <button 
              className="cd-btn-translate" 
              onClick={() => handleTranslate(material.id_material, material.contenido)}
              disabled={translatingId === material.id_material}
            >
              {translatingId === material.id_material ? 'Traduciendo...' : 
               translations[material.id_material] ? 'Ver Original' : 'Traducir al Inglés'}
            </button>
          </div>
        );
      case 'enlace':
        return (
          <div className="cd-material-link">
            <a href={material.contenido} target="_blank" rel="noopener noreferrer" className="cd-link">
              {material.contenido}
            </a>
          </div>
        );
      case 'video':
        let embedUrl = '';
        if (material.contenido.includes('youtube.com') || material.contenido.includes('youtu.be')) {
          const videoId = material.contenido.includes('youtu.be')
            ? material.contenido.split('/').pop()?.split('?')[0]
            : new URL(material.contenido).searchParams.get('v');
          embedUrl = `https://www.youtube.com/embed/${videoId}`;
        } else if (material.contenido.includes('vimeo.com')) {
          const videoId = material.contenido.split('/').pop();
          embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
        return embedUrl ? (
          <div className="cd-material-video">
            <iframe
              src={embedUrl}
              title={material.titulo}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="cd-video-iframe"
            ></iframe>
          </div>
        ) : (
          <div className="cd-material-link">
            <a href={material.contenido} target="_blank" rel="noopener noreferrer" className="cd-link">
              Ver video
            </a>
          </div>
        );
      case 'documento':
        return (
          <div className="cd-material-document">
            <a href={material.contenido} target="_blank" rel="noopener noreferrer" className="cd-document-link" download>
              Descargar documento
            </a>
          </div>
        );
      default:
        return <p>{material.contenido}</p>;
    }
  };

  const openUnitModal = (unit = null) => {
    if (unit) {
      setEditingUnit(unit);
      setUnitFormData({ nombre_unidad: unit.nombre_unidad, orden: unit.orden });
    } else {
      setEditingUnit(null);
      setUnitFormData({ nombre_unidad: '', orden: (units.length || 0) + 1 });
    }
    setUnitFormErrors({});
    setShowUnitModal(true);
  };

  const openMaterialModal = (unitId, material = null) => {
    if (material) {
      setEditingMaterial(material);
      setMaterialFormData({ titulo_material: material.titulo_material, contenido: material.contenido, tipo_material: material.tipo_material, id_unidad: unitId });
    } else {
      setEditingMaterial(null);
      setMaterialFormData({ titulo_material: '', contenido: '', tipo_material: 'texto', id_unidad: unitId });
    }
    setMaterialFormErrors({});
    setShowMaterialModal(true);
  };

  const openTaskModal = (unitId, task = null) => {
    if (task) {
      setEditingTask(task);
      const fechaLimite = task.fecha_limite ? task.fecha_limite.split('T')[0] : '';
      setTaskFormData({ titulo_tarea: task.titulo_tarea, instrucciones: task.instrucciones || '', fecha_limite: fechaLimite, criterios: task.criterios || '', id_unidad: unitId });
    } else {
      setEditingTask(null);
      setTaskFormData({ titulo_tarea: '', instrucciones: '', fecha_limite: '', criterios: '', id_unidad: unitId });
    }
    setTaskFormErrors({});
    setShowTaskModal(true);
  };

  const openQuizModal = (unitId, quiz = null) => {
    if (quiz) {
      setEditingQuiz(quiz);
      setQuizFormData({ titulo_cuestionario: quiz.titulo_cuestionario, id_unidad: unitId });
    } else {
      setEditingQuiz(null);
      setQuizFormData({ titulo_cuestionario: '', id_unidad: unitId });
    }
    setQuizFormErrors({});
    setShowQuizModal(true);
  };

  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!unitFormData.nombre_unidad.trim()) errors.nombre_unidad = 'El título es obligatorio';
    if (!unitFormData.orden || unitFormData.orden < 1) errors.orden = 'El orden debe ser mayor a 0';
    setUnitFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const unitData = {
        nombre_unidad: unitFormData.nombre_unidad.trim(),
        orden: parseInt(unitFormData.orden),
        id_curso: courseId,
      };

      if (editingUnit) {
        const { error: updateError } = await supabase.from('unidades').update(unitData).eq('id_unidad', editingUnit.id_unidad);
        if (updateError) throw updateError;
        setActionSuccess('Unidad actualizada correctamente');
      } else {
        const { error: insertError } = await supabase.from('unidades').insert([unitData]);
        if (insertError) throw insertError;
        setActionSuccess('Unidad creada correctamente');
      }

      setShowUnitModal(false);
      fetchCourse();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!materialFormData.titulo_material.trim()) errors.titulo_material = 'El título es obligatorio';
    if (!materialFormData.contenido.trim()) errors.contenido = 'El contenido es obligatorio';
    if (!materialFormData.tipo_material) errors.tipo_material = 'El tipo es obligatorio';
    setMaterialFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const materialData = {
        titulo_material: materialFormData.titulo_material.trim(),
        contenido: materialFormData.contenido.trim(),
        tipo_material: materialFormData.tipo_material,
        id_unidad: materialFormData.id_unidad,
      };

      if (editingMaterial) {
        const { error: updateError } = await supabase.from('materiales').update(materialData).eq('id_material', editingMaterial.id_material);
        if (updateError) throw updateError;
        setActionSuccess('Material actualizado correctamente');
      } else {
        const { error: insertError } = await supabase.from('materiales').insert([materialData]);
        if (insertError) throw insertError;
        setActionSuccess('Material creado correctamente');
      }

      setShowMaterialModal(false);
      fetchCourse();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!taskFormData.titulo_tarea.trim()) errors.titulo_tarea = 'El título es obligatorio';
    if (!taskFormData.instrucciones.trim()) errors.instrucciones = 'Las instrucciones son obligatorias';
    if (!taskFormData.fecha_limite) errors.fecha_limite = 'La fecha límite es obligatoria';
    setTaskFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const taskData = {
        titulo_tarea: taskFormData.titulo_tarea.trim(),
        instrucciones: taskFormData.instrucciones.trim(),
        fecha_limite: taskFormData.fecha_limite,
        criterios: taskFormData.criterios.trim() || null,
        id_unidad: taskFormData.id_unidad,
      };

      if (editingTask) {
        const { error: updateError } = await supabase.from('tareas').update(taskData).eq('id_tarea', editingTask.id_tarea);
        if (updateError) throw updateError;
        setActionSuccess('Tarea actualizada correctamente');
      } else {
        const { error: insertError } = await supabase.from('tareas').insert([taskData]);
        if (insertError) throw insertError;
        setActionSuccess('Tarea creada correctamente');
      }

      setShowTaskModal(false);
      fetchCourse();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!quizFormData.titulo_cuestionario.trim()) errors.titulo_cuestionario = 'El título es obligatorio';
    setQuizFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const quizData = {
        titulo_cuestionario: quizFormData.titulo_cuestionario.trim(),
        id_unidad: quizFormData.id_unidad,
      };

      if (editingQuiz) {
        const { error: updateError } = await supabase.from('cuestionarios').update(quizData).eq('id_cuestionario', editingQuiz.id_cuestionario);
        if (updateError) throw updateError;
        setActionSuccess('Cuestionario actualizado correctamente');
      } else {
        const { error: insertError } = await supabase.from('cuestionarios').insert([quizData]);
        if (insertError) throw insertError;
        setActionSuccess('Cuestionario creado correctamente');
      }

      setShowQuizModal(false);
      fetchCourse();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (table, id, idField = 'id') => {
    setDeleteConfirm(null);
    setActionLoading(true);
    setActionSuccess(null);
    setError(null);
    try {
      const { error: deleteError } = await supabase.from(table).delete().eq(idField, id);
      if (deleteError) throw deleteError;
      setActionSuccess('Elemento eliminado correctamente');
      fetchCourse();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="cd-loading">Cargando curso...</div>;
  }

  if (!course) {
    return (
      <div className="cd-not-found">
        <h2>Curso no encontrado</h2>
        <Link to="/" className="cd-btn-back">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="cd-container">
      {error && <div className="cd-error">{error}</div>}
      {actionSuccess && <div className="cd-success">{actionSuccess}</div>}

      <div className="cd-header">
        <Link to={role === 'estudiante' ? '/estudiante/my-courses' : role === 'docente' ? '/docente/my-courses' : '/'} className="cd-btn-back">
          &larr; Volver
        </Link>
        <div className="cd-header-content">
          <h1>{course.nombre_curso}</h1>
          <p className="cd-description">{course.descripcion}</p>
          <div className="cd-meta">
            {teacher && <span className="cd-teacher">Docente: {teacher.nombre}</span>}
            <span className={`cd-status ${course.estado === 'activo' ? 'cd-status-active' : 'cd-status-inactive'}`}>
              {course.estado}
            </span>
            <span className="cd-category">{course.categoria}</span>
          </div>
        </div>
        {canEdit && (
          <button className="cd-btn-primary" onClick={() => openUnitModal()}>
            + Nueva Unidad
          </button>
        )}
      </div>

      <div className="cd-units">
        {units.length === 0 ? (
          <div className="cd-empty">
            <p>No hay unidades en este curso aún.</p>
            {canEdit && (
              <button className="cd-btn-primary" onClick={() => openUnitModal()}>
                Crear primera unidad
              </button>
            )}
          </div>
        ) : (
          units.map((unit) => (
            <div key={unit.id_unidad} className="cd-unit">
              <div className="cd-unit-header">
                <div>
                  <h2>Unidad {unit.orden}: {unit.nombre_unidad}</h2>
                </div>
                {canEdit && (
                  <div className="cd-unit-actions">
                    <button className="cd-btn-edit" onClick={() => openUnitModal(unit)}>Editar</button>
                    <button className="cd-btn-delete" onClick={() => setDeleteConfirm({ table: 'unidades', id: unit.id_unidad, idField: 'id_unidad', name: unit.nombre_unidad })}>Eliminar</button>
                  </div>
                )}
              </div>

              <div className="cd-section">
                <div className="cd-section-header">
                  <h3>Materiales</h3>
                  {canEdit && (
                    <button className="cd-btn-small" onClick={() => openMaterialModal(unit.id_unidad)}>
                      + Material
                    </button>
                  )}
                </div>
                {unit.materials.length === 0 ? (
                  <p className="cd-empty-text">No hay materiales en esta unidad.</p>
                ) : (
                  <div className="cd-materials-list">
                    {unit.materials.map((m) => (
                      <div key={m.id_material} className="cd-material-item">
                        <div className="cd-material-info">
                          <span className={`cd-material-badge cd-badge-${m.tipo_material}`}>{m.tipo_material}</span>
                          <h4>{m.titulo_material}</h4>
                        </div>
                        {renderMaterial(m)}
                        {canEdit && (
                          <div className="cd-material-actions">
                            <button className="cd-btn-icon" onClick={() => openMaterialModal(unit.id_unidad, m)}>Edit</button>
                            <button className="cd-btn-icon-delete" onClick={() => setDeleteConfirm({ table: 'materiales', id: m.id_material, idField: 'id_material', name: m.titulo_material })}>Del</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cd-section">
                <div className="cd-section-header">
                  <h3>Tareas</h3>
                  {canEdit && (
                    <button className="cd-btn-small" onClick={() => openTaskModal(unit.id_unidad)}>
                      + Tarea
                    </button>
                  )}
                </div>
                {unit.tasks.length === 0 ? (
                  <p className="cd-empty-text">No hay tareas en esta unidad.</p>
                ) : (
                  <div className="cd-tasks-list">
                    {unit.tasks.map((t) => (
                      <div key={t.id_tarea} className="cd-task-item">
                        <div className="cd-task-info">
                          <h4>{t.titulo_tarea}</h4>
                          <p className="cd-task-instructions">{t.instrucciones}</p>
                          <div className="cd-task-meta">
                            <span className="cd-task-deadline">Entrega: {new Date(t.fecha_limite).toLocaleDateString('es-ES')}</span>
                            {t.criterios && <span className="cd-task-criteria">Criterios: {t.criterios}</span>}
                          </div>
                        </div>
                        {role === 'estudiante' && (
                          <Link to={`/estudiante/task/${t.id_tarea}/submit`} className="cd-btn-submit">
                            Entregar
                          </Link>
                        )}
                        {canEdit && (
                          <div className="cd-task-actions">
                            <Link to={`/docente/task/${t.id_tarea}/review`} className="cd-btn-review">Ver entregas</Link>
                            <button className="cd-btn-icon" onClick={() => openTaskModal(unit.id_unidad, t)}>Edit</button>
                            <button className="cd-btn-icon-delete" onClick={() => setDeleteConfirm({ table: 'tareas', id: t.id_tarea, idField: 'id_tarea', name: t.titulo_tarea })}>Del</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="cd-section">
                <div className="cd-section-header">
                  <h3>Quizzes</h3>
                  {canEdit && (
                    <button className="cd-btn-small" onClick={() => openQuizModal(unit.id_unidad)}>
                      + Quiz
                    </button>
                  )}
                </div>
                {unit.cuestionarios.length === 0 ? (
                  <p className="cd-empty-text">No hay cuestionarios en esta unidad.</p>
                ) : (
                  <div className="cd-quizzes-list">
                    {unit.cuestionarios.map((q) => (
                      <div key={q.id_cuestionario} className="cd-quiz-item">
                        <div className="cd-quiz-info">
                          <h4>{q.titulo_cuestionario}</h4>
                        </div>
                        {role === 'estudiante' && (
                          <Link to={`/estudiante/quiz/${q.id_cuestionario}`} className="cd-btn-start">Iniciar</Link>
                        )}
                        {canEdit && (
                          <div className="cd-quiz-actions">
                            <button className="cd-btn-icon" onClick={() => openQuizModal(unit.id_unidad, q)}>Edit</button>
                            <button className="cd-btn-icon-delete" onClick={() => setDeleteConfirm({ table: 'cuestionarios', id: q.id_cuestionario, idField: 'id_cuestionario', name: q.titulo_cuestionario })}>Del</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showUnitModal && (
        <div className="cd-modal-overlay" onClick={() => setShowUnitModal(false)}>
          <div className="cd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>{editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}</h2>
              <button className="cd-modal-close" onClick={() => setShowUnitModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUnitSubmit}>
              <div className="cd-form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={unitFormData.nombre_unidad}
                  onChange={(e) => setUnitFormData({ ...unitFormData, nombre_unidad: e.target.value })}
                  className={unitFormErrors.nombre_unidad ? 'cd-input-error' : ''}
                  placeholder="Nombre de la unidad"
                />
                {unitFormErrors.nombre_unidad && <span className="cd-error-text">{unitFormErrors.nombre_unidad}</span>}
              </div>
              <div className="cd-form-group">
                <label>Orden</label>
                <input
                  type="number"
                  value={unitFormData.orden}
                  onChange={(e) => setUnitFormData({ ...unitFormData, orden: e.target.value })}
                  className={unitFormErrors.orden ? 'cd-input-error' : ''}
                  min="1"
                />
                {unitFormErrors.orden && <span className="cd-error-text">{unitFormErrors.orden}</span>}
              </div>
              <div className="cd-modal-actions">
                <button type="button" className="cd-btn-secondary" onClick={() => setShowUnitModal(false)}>Cancelar</button>
                <button type="submit" className="cd-btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : editingUnit ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="cd-modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="cd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>{editingMaterial ? 'Editar Material' : 'Nuevo Material'}</h2>
              <button className="cd-modal-close" onClick={() => setShowMaterialModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleMaterialSubmit}>
              <div className="cd-form-group">
                <label>Título</label>
                <input
                  type="text"
                  value={materialFormData.titulo_material}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, titulo_material: e.target.value })}
                  className={materialFormErrors.titulo_material ? 'cd-input-error' : ''}
                  placeholder="Título del material"
                />
                {materialFormErrors.titulo_material && <span className="cd-error-text">{materialFormErrors.titulo_material}</span>}
              </div>
              <div className="cd-form-group">
                <label>Tipo de Material</label>
                <select
                  value={materialFormData.tipo_material}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, tipo_material: e.target.value })}
                  className={materialFormErrors.tipo_material ? 'cd-input-error' : ''}
                >
                  <option value="texto">Texto</option>
                  <option value="enlace">Enlace</option>
                  <option value="video">Video</option>
                  <option value="documento">Documento</option>
                </select>
                {materialFormErrors.tipo_material && <span className="cd-error-text">{materialFormErrors.tipo_material}</span>}
              </div>
              <div className="cd-form-group">
                <label>Contenido</label>
                <textarea
                  value={materialFormData.contenido}
                  onChange={(e) => setMaterialFormData({ ...materialFormData, contenido: e.target.value })}
                  className={materialFormErrors.contenido ? 'cd-input-error' : ''}
                  placeholder={
                    materialFormData.tipo_material === 'texto' ? 'Contenido del material' :
                    materialFormData.tipo_material === 'enlace' ? 'URL del enlace' :
                    materialFormData.tipo_material === 'video' ? 'URL de YouTube o Vimeo' :
                    'URL del documento'
                  }
                  rows="4"
                />
                {materialFormErrors.contenido && <span className="cd-error-text">{materialFormErrors.contenido}</span>}
              </div>
              <div className="cd-modal-actions">
                <button type="button" className="cd-btn-secondary" onClick={() => setShowMaterialModal(false)}>Cancelar</button>
                <button type="submit" className="cd-btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : editingMaterial ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="cd-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="cd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button className="cd-modal-close" onClick={() => setShowTaskModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="cd-form-group">
                <label>Título de la Tarea</label>
                <input
                  type="text"
                  value={taskFormData.titulo_tarea}
                  onChange={(e) => setTaskFormData({ ...taskFormData, titulo_tarea: e.target.value })}
                  className={taskFormErrors.titulo_tarea ? 'cd-input-error' : ''}
                  placeholder="Título de la tarea"
                />
                {taskFormErrors.titulo_tarea && <span className="cd-error-text">{taskFormErrors.titulo_tarea}</span>}
              </div>
              <div className="cd-form-group">
                <label>Instrucciones</label>
                <textarea
                  value={taskFormData.instrucciones}
                  onChange={(e) => setTaskFormData({ ...taskFormData, instrucciones: e.target.value })}
                  className={taskFormErrors.instrucciones ? 'cd-input-error' : ''}
                  placeholder="Instrucciones de la tarea"
                  rows="4"
                />
                {taskFormErrors.instrucciones && <span className="cd-error-text">{taskFormErrors.instrucciones}</span>}
              </div>
              <div className="cd-form-group">
                <label>Fecha de Entrega</label>
                <input
                  type="date"
                  value={taskFormData.fecha_limite}
                  onChange={(e) => setTaskFormData({ ...taskFormData, fecha_limite: e.target.value })}
                  className={taskFormErrors.fecha_limite ? 'cd-input-error' : ''}
                />
                {taskFormErrors.fecha_limite && <span className="cd-error-text">{taskFormErrors.fecha_limite}</span>}
              </div>
              <div className="cd-form-group">
                <label>Criterios de Evaluación</label>
                <textarea
                  value={taskFormData.criterios}
                  onChange={(e) => setTaskFormData({ ...taskFormData, criterios: e.target.value })}
                  placeholder="Criterios opcionales"
                  rows="3"
                />
              </div>
              <div className="cd-modal-actions">
                <button type="button" className="cd-btn-secondary" onClick={() => setShowTaskModal(false)}>Cancelar</button>
                <button type="submit" className="cd-btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : editingTask ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuizModal && (
        <div className="cd-modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="cd-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>{editingQuiz ? 'Editar Quiz' : 'Nuevo Quiz'}</h2>
              <button className="cd-modal-close" onClick={() => setShowQuizModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleQuizSubmit}>
              <div className="cd-form-group">
                <label>Título del Cuestionario</label>
                <input
                  type="text"
                  value={quizFormData.titulo_cuestionario}
                  onChange={(e) => setQuizFormData({ ...quizFormData, titulo_cuestionario: e.target.value })}
                  className={quizFormErrors.titulo_cuestionario ? 'cd-input-error' : ''}
                  placeholder="Título del cuestionario"
                />
                {quizFormErrors.titulo_cuestionario && <span className="cd-error-text">{quizFormErrors.titulo_cuestionario}</span>}
              </div>
              <div className="cd-modal-actions">
                <button type="button" className="cd-btn-secondary" onClick={() => setShowQuizModal(false)}>Cancelar</button>
                <button type="submit" className="cd-btn-primary" disabled={actionLoading}>
                  {actionLoading ? 'Guardando...' : editingQuiz ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="cd-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="cd-modal-content cd-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="cd-modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="cd-modal-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <p className="cd-confirm-text">
              ¿Está seguro de eliminar <strong>{deleteConfirm.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="cd-modal-actions">
              <button className="cd-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="cd-btn-delete" onClick={() => handleDelete(deleteConfirm.table, deleteConfirm.id, deleteConfirm.idField)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cd-container {
          padding: 0;
          max-width: 100%;
          margin: 0 auto;
        }
        .cd-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 18px;
          color: var(--text-secondary);
        }
        .cd-not-found {
          text-align: center;
          padding: 60px 20px;
        }
        .cd-not-found h2 { color: var(--text-primary); margin-bottom: 16px; }
        .cd-error {
          background: var(--danger-subtle);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .cd-success {
          background: var(--success-subtle);
          color: var(--success);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .cd-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          gap: 16px;
        }
        .cd-header-content { flex: 1; }
        .cd-header h1 {
          font-size: 28px;
          color: var(--text-primary);
          margin: 0 0 8px 0;
          font-family: 'Outfit', sans-serif;
        }
        .cd-description {
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          font-size: 15px;
        }
        .cd-meta {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }
        .cd-teacher {
          font-size: 14px;
          color: var(--text-primary);
          font-weight: 500;
        }
        .cd-status {
          font-size: 12px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 500;
        }
        .cd-status-active { background: var(--success-subtle); color: var(--success); }
        .cd-status-inactive { background: var(--danger-subtle); color: var(--danger); }
        .cd-category {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .cd-btn-back {
          color: var(--accent);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          white-space: nowrap;
        }
        .cd-btn-back:hover { text-decoration: underline; }
        .cd-btn-primary {
          background: var(--accent);
          color: var(--bg-surface);
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
          white-space: nowrap;
        }
        .cd-btn-primary:hover { background: var(--accent); opacity: 0.85; }
        .cd-btn-primary:disabled { background: var(--accent-medium); cursor: not-allowed; }
        .cd-btn-secondary {
          background: var(--bg-subtle);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .cd-btn-secondary:hover { background: var(--border-default); }
        .cd-btn-delete {
          background: var(--danger-subtle);
          color: var(--danger);
          border: none;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
        }
        .cd-btn-delete:hover { background: var(--danger-subtle); }
        .cd-btn-edit {
          background: var(--accent-subtle);
          color: var(--accent);
          border: none;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
        }
        .cd-btn-edit:hover { background: var(--accent-medium); }
        .cd-btn-small {
          background: var(--accent);
          color: var(--bg-surface);
          border: none;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
        }
        .cd-btn-small:hover { background: var(--accent); opacity: 0.85; }
        .cd-btn-submit {
          background: var(--accent);
          color: var(--bg-surface);
          border: none;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
        }
        .cd-btn-submit:hover { background: var(--accent); opacity: 0.85; }
        .cd-btn-start {
          background: var(--success);
          color: var(--bg-surface);
          border: none;
          padding: 8px 16px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
        }
        .cd-btn-start:hover { background: var(--success); opacity: 0.85; }
        .cd-btn-icon {
          background: var(--accent-subtle);
          color: var(--accent);
          border: none;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 500;
        }
        .cd-btn-icon:hover { background: var(--accent-medium); }
        .cd-btn-icon-delete {
          background: var(--danger-subtle);
          color: var(--danger);
          border: none;
          padding: 4px 8px;
          border-radius: 10px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 500;
        }
        .cd-btn-icon-delete:hover { background: var(--danger-subtle); }
        .cd-empty {
          text-align: center;
          padding: 40px;
          background: var(--bg-subtle);
          border-radius: 20px;
          border: 1px dashed var(--border-default);
        }
        .cd-empty p { color: var(--text-tertiary); margin-bottom: 16px; }
        .cd-units { display: flex; flex-direction: column; gap: 24px; }
        .cd-unit {
          background: var(--bg-surface);
          border-radius: 20px;
          border: 1px solid var(--border-default);
          padding: 20px;
          box-shadow: var(--shadow-outset-sm);
        }
        .cd-unit-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 12px;
        }
        .cd-unit-header h2 {
          font-size: 20px;
          color: var(--text-primary);
          margin: 0 0 4px 0;
          font-family: 'Outfit', sans-serif;
        }
        .cd-unit-desc {
          color: var(--text-secondary);
          margin: 0;
          font-size: 14px;
        }
        .cd-unit-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .cd-section {
          margin-bottom: 20px;
          padding: 16px;
          background: var(--bg-subtle);
          border-radius: 12px;
        }
        .cd-section:last-child { margin-bottom: 0; }
        .cd-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .cd-section h3 {
          font-size: 16px;
          color: var(--text-primary);
          margin: 0;
          font-family: 'Outfit', sans-serif;
        }
        .cd-empty-text {
          color: var(--text-tertiary);
          font-size: 14px;
          margin: 0;
        }
        .cd-materials-list, .cd-tasks-list, .cd-quizzes-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cd-material-item {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 12px;
        }
        .cd-material-info {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .cd-material-info h4 {
          margin: 0;
          font-size: 14px;
          color: var(--text-primary);
        }
        .cd-material-badge {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }
        .cd-badge-texto { background: var(--info-subtle); color: var(--info); }
        .cd-badge-enlace { background: var(--success-subtle); color: var(--success); }
        .cd-badge-video { background: rgba(212, 107, 107, 0.1); color: var(--danger); }
        .cd-badge-documento { background: var(--warning-subtle); color: var(--warning); }
        .cd-material-text p {
          margin: 0;
          color: var(--text-primary);
          font-size: 14px;
          line-height: 1.6;
        }
        .cd-btn-translate {
          background: var(--info-subtle);
          color: var(--info);
          border: 1px solid var(--info);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 600;
          margin-top: 8px;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .cd-btn-translate:hover:not(:disabled) {
          background: var(--info);
          color: white;
        }
        .cd-btn-translate:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cd-material-link { margin: 8px 0; }
        .cd-link {
          color: var(--accent);
          text-decoration: none;
          font-size: 14px;
          word-break: break-all;
        }
        .cd-link:hover { text-decoration: underline; }
        .cd-material-video { margin: 8px 0; }
        .cd-video-iframe {
          width: 100%;
          height: 315px;
          border-radius: 12px;
        }
        .cd-material-document { margin: 8px 0; }
        .cd-document-link {
          color: var(--warning);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
        }
        .cd-document-link:hover { text-decoration: underline; }
        .cd-material-actions, .cd-task-actions, .cd-quiz-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }
        .cd-btn-review {
          background: var(--warning);
          color: var(--bg-surface);
          border: none;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          text-decoration: none;
          display: inline-block;
          transition: background 0.2s;
        }
        .cd-btn-review:hover { background: var(--warning); }
        .cd-task-item, .cd-quiz-item {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .cd-task-info h4, .cd-quiz-info h4 {
          margin: 0 0 4px 0;
          font-size: 14px;
          color: var(--text-primary);
        }
        .cd-task-instructions {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .cd-task-meta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          font-size: 12px;
        }
        .cd-task-deadline { color: var(--danger); font-weight: 500; }
        .cd-task-criteria { color: var(--text-secondary); }
        .cd-quiz-info p {
          margin: 0;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .cd-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .cd-modal-content {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-outset);
        }
        .cd-modal-confirm { max-width: 400px; }
        .cd-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .cd-modal-header h2 {
          font-size: 20px;
          color: var(--text-primary);
          margin: 0;
          font-family: 'Outfit', sans-serif;
        }
        .cd-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          line-height: 1;
        }
        .cd-modal-close:hover { color: var(--text-primary); }
        .cd-form-group { margin-bottom: 16px; }
        .cd-form-group label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .cd-form-group input,
        .cd-form-group textarea,
        .cd-form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-default);
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .cd-form-group input:focus,
        .cd-form-group textarea:focus,
        .cd-form-group select:focus {
          border-color: var(--accent);
        }
        .cd-input-error { border-color: var(--danger) !important; }
        .cd-error-text {
          color: var(--danger);
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }
        .cd-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .cd-confirm-text {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.5;
        }
        @media (max-width: 768px) {
          .cd-header {
            flex-direction: column;
          }
          .cd-unit-header {
            flex-direction: column;
          }
          .cd-video-iframe {
            height: 200px;
          }
        }
      `}</style>
    </div>
  );
};

export default CursoDetalle;
