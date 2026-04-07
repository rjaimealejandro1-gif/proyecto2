import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import FileUploader from '../../components/FileUploader';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const EntregaTarea = () => {
  const { taskId } = useParams();
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [task, setTask] = useState(null);
  const [unit, setUnit] = useState(null);
  const [course, setCourse] = useState(null);
  const [existingDelivery, setExistingDelivery] = useState(null);
  const [deliveryType, setDeliveryType] = useState('texto');
  const [evidencia, setEvidencia] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isPastDeadline, setIsPastDeadline] = useState(false);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId) fetchTask();
  }, [taskId, usuarioId]);

  const fetchTask = async () => {
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

      if (taskData.fecha_limite) {
        const deadline = new Date(taskData.fecha_limite);
        const now = new Date();
        setIsPastDeadline(now > deadline);
      }

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

      const { data: deliveryData } = await supabase
        .from('entregas')
        .select('*')
        .eq('id_tarea', taskId)
        .eq('id_estudiante', usuarioId)
        .order('fecha_entrega', { ascending: false })
        .limit(1);

      if (deliveryData && deliveryData.length > 0) {
        setExistingDelivery(deliveryData[0]);
        setEvidencia(deliveryData[0].evidencia || '');
        setDeliveryType(deliveryData[0].tipo_entrega || 'texto');
        if (deliveryData[0].archivo_url) {
          setUploadedFile({
            url: deliveryData[0].archivo_url,
            name: deliveryData[0].archivo_nombre || 'Archivo',
            type: deliveryData[0].archivo_tipo,
            size: deliveryData[0].archivo_tamano,
          });
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (deliveryType === 'texto' && !evidencia.trim()) {
      setError('El contenido es obligatorio');
      return;
    }

    if (deliveryType === 'archivo' && !uploadedFile) {
      setError('Debes subir un archivo');
      return;
    }

    setSubmitting(true);
    try {
      const deliveryData = {
        id_tarea: taskId,
        id_estudiante: usuarioId,
        evidencia: deliveryType === 'texto' ? evidencia.trim() : evidencia, // Guardar la URL del enlace/video en evidencia
        tipo_entrega: deliveryType,
        fecha_entrega: new Date().toISOString(),
        calificacion: 100, // Calificación automática
        nota_docente: 'Calificado automáticamente',
        archivo_url: uploadedFile?.url || null,
        archivo_nombre: uploadedFile?.name || null,
        archivo_tipo: uploadedFile?.type || null,
        archivo_tamano: uploadedFile?.size || null,
      };

      let result;
      let newDeliveryId = existingDelivery?.id_entrega;

      if (existingDelivery) {
        result = await supabase
          .from('entregas')
          .update(deliveryData)
          .eq('id_entrega', existingDelivery.id_entrega)
          .select();
      } else {
        result = await supabase
          .from('entregas')
          .insert([deliveryData])
          .select();
        
        if (result.data && result.data.length > 0) {
          newDeliveryId = result.data[0].id_entrega;
        }
      }

      if (result.error) throw result.error;

      // Insertar o actualizar automáticamente en la tabla de calificaciones
      const { data: existingGrade } = await supabase
        .from('calificaciones')
        .select('id_calificacion')
        .eq('id_estudiante', usuarioId)
        .eq('id_curso', course?.id_curso)
        .eq('tipo_referencia', 'tarea')
        .eq('id_referencia', newDeliveryId || taskId) // Usar taskId porque DocenteCalificaciones lo guarda así
        .maybeSingle();

      const calData = {
        id_estudiante: usuarioId,
        id_curso: course?.id_curso,
        tipo_referencia: 'tarea',
        id_referencia: taskId, // Clave para vincular con la tarea
        nota_obtenida: 100, // Calificación automática
        fecha_calificacion: new Date().toISOString(),
        nombre_actividad: task?.titulo_tarea || 'Tarea',
      };

      if (existingGrade) {
        await supabase.from('calificaciones').update(calData).eq('id_calificacion', existingGrade.id_calificacion);
      } else {
        await supabase.from('calificaciones').insert([calData]);
      }


      setSuccess(existingDelivery ? 'Tarea re-entregada correctamente' : 'Tarea entregada correctamente');
      fetchTask();
    } catch (err) {
      setError(err.message || 'Error al entregar la tarea');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="et-loading">Cargando tarea...</div>;
  if (!task) {
    return (
      <div className="et-not-found">
        <h2>Tarea no encontrada</h2>
        <Link to="/estudiante/my-courses" className="et-btn-back">Volver a mis cursos</Link>
      </div>
    );
  }

  const DELIVERY_TYPES = [
    { id: 'texto', label: 'Texto', icon: '📝', placeholder: 'Escribe tu respuesta aqui...' },
    { id: 'documento', label: 'Documento', icon: '📄', placeholder: 'Pega la URL de tu documento (Google Docs, Drive, etc.)' },
    { id: 'video', label: 'Video', icon: '🎬', placeholder: 'Pega la URL de tu video (YouTube, Vimeo, Drive, etc.)' },
    { id: 'enlace', label: 'Enlace', icon: '🔗', placeholder: 'Pega la URL de tu evidencia' },
    { id: 'archivo', label: 'Archivo', icon: '📁', placeholder: 'Sube tu archivo' },
  ];

  const renderPreview = () => {
    if (deliveryType === 'archivo' && uploadedFile) return null;
    if (deliveryType === 'texto' && !evidencia.trim()) return null;
    if ((deliveryType === 'documento' || deliveryType === 'enlace') && !evidencia.trim()) return null;

    switch (deliveryType) {
      case 'texto':
        return <p className="et-preview-text">{evidencia}</p>;
      case 'documento':
      case 'enlace':
        return <a href={evidencia} target="_blank" rel="noopener noreferrer" className="et-preview-link">Abrir documento/enlace &#8599;</a>;
      case 'video':
        let embedUrl = '';
        if (evidencia.includes('youtube.com') || evidencia.includes('youtu.be')) {
          const videoId = evidencia.includes('youtu.be') ? evidencia.split('/').pop()?.split('?')[0] : new URL(evidencia).searchParams.get('v');
          embedUrl = 'https://www.youtube.com/embed/' + videoId;
        } else if (evidencia.includes('vimeo.com')) {
          const videoId = evidencia.split('/').pop();
          embedUrl = 'https://player.vimeo.com/video/' + videoId;
        }
        return embedUrl ? <iframe src={embedUrl} title="Preview" className="et-preview-video" frameBorder="0" allowFullScreen /> : <a href={evidencia} target="_blank" rel="noopener noreferrer" className="et-preview-link">Ver video &#8599;</a>;
      default:
        return null;
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return '📄';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎬';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📕';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="et-container">
      <style>{`
        .et-container { padding: 1.5rem; max-width: 50rem; margin: 0 auto; font-family: 'DM Sans', -apple-system, sans-serif; }
        .et-loading { display: flex; justify-content: center; align-items: center; min-height: 25rem; font-size: 1.125rem; color: var(--text-secondary); }
        .et-not-found { text-align: center; padding: 3.75rem 1.25rem; }
        .et-not-found h2 { color: var(--text-primary); margin-bottom: 1rem; font-family: 'Outfit', sans-serif; }
        .et-error { background: var(--danger-subtle); color: var(--danger); padding: 0.75rem 1rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: var(--shadow-outset-sm); }
        .et-success { background: var(--success-subtle); color: var(--success); padding: 0.75rem 1rem; border-radius: 12px; margin-bottom: 1rem; box-shadow: var(--shadow-outset-sm); }
        .et-header { margin-bottom: 1.5rem; }
        .et-btn-back { color: var(--accent); text-decoration: none; font-size: 0.875rem; font-weight: 500; display: inline-block; margin-bottom: 0.75rem; }
        .et-btn-back:hover { text-decoration: underline; }
        .et-header-content h1 { font-size: 1.75rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-family: 'Outfit', sans-serif; }
        .et-unit-name { color: var(--text-secondary); margin: 0 0 0.25rem 0; font-size: 0.875rem; }
        .et-course-name { color: var(--accent); margin: 0; font-size: 0.875rem; font-weight: 500; }
        .et-details { display: flex; flex-direction: column; gap: 1.25rem; }
        .et-detail-card { background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-default); padding: 1.25rem; box-shadow: var(--shadow-outset-sm); }
        .et-detail-card h2 { font-size: 1.25rem; color: var(--text-primary); margin: 0 0 1rem 0; font-family: 'Outfit', sans-serif; }
        .et-detail-section { margin-bottom: 1rem; }
        .et-detail-section h3 { font-size: 0.9375rem; color: var(--text-primary); margin: 0 0 0.5rem 0; font-weight: 600; font-family: 'Outfit', sans-serif; }
        .et-instructions, .et-criteria { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; margin: 0; white-space: pre-wrap; }
        .et-detail-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0; border-top: 1px solid var(--bg-subtle); }
        .et-detail-label { font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }
        .et-deadline { font-size: 0.875rem; color: var(--success); font-weight: 600; }
        .et-deadline-passed { color: var(--danger); }
        .et-existing-delivery { background: var(--success-subtle); border-radius: 12px; border: 1px solid var(--success-subtle); padding: 1.25rem; box-shadow: var(--shadow-outset-sm); }
        .et-existing-delivery h3 { font-size: 1rem; color: var(--success); margin: 0 0 0.75rem 0; font-family: 'Outfit', sans-serif; }
        .et-delivery-info { display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 0.75rem; align-items: center; }
        .et-delivery-date { font-size: 0.8125rem; color: var(--text-secondary); }
        .et-type-badge { font-size: 0.6875rem; padding: 0.1875rem 0.625rem; border-radius: 12px; font-weight: 600; text-transform: capitalize; }
        .et-type-texto { background: var(--info-subtle); color: var(--info); }
        .et-type-documento { background: rgba(212, 107, 107, 0.1); color: var(--danger); }
        .et-type-video { background: var(--warning-subtle); color: var(--warning); }
        .et-type-enlace { background: var(--success-subtle); color: var(--success); }
        .et-type-archivo { background: var(--accent-subtle); color: var(--accent); }
        .et-grade { font-size: 0.875rem; font-weight: 600; padding: 0.25rem 0.625rem; border-radius: 1.25rem; }
        .et-grade-pass { background: var(--success-subtle); color: var(--success); }
        .et-grade-fail { background: var(--danger-subtle); color: var(--danger); }
        .et-grade-pending { font-size: 0.8125rem; color: var(--warning); font-style: italic; }
        .et-teacher-note { background: var(--accent-subtle); border-radius: 12px; padding: 0.75rem; margin-bottom: 0.75rem; border: 1px solid var(--accent-medium); box-shadow: var(--shadow-outset-sm); }
        .et-teacher-note h4 { font-size: 0.8125rem; color: var(--accent); margin: 0 0 0.25rem 0; font-family: 'Outfit', sans-serif; }
        .et-teacher-note p { font-size: 0.875rem; color: var(--text-primary); margin: 0; white-space: pre-wrap; }
        .et-evidence-preview { background: var(--bg-elevated); border-radius: 12px; padding: 0.75rem; border: 1px solid var(--border-default); box-shadow: var(--shadow-outset-sm); }
        .et-evidence-preview h4 { font-size: 0.8125rem; color: var(--text-primary); margin: 0 0 0.375rem 0; font-family: 'Outfit', sans-serif; }
        .et-evidence-text { font-size: 0.8125rem; color: var(--text-secondary); margin: 0; word-break: break-all; white-space: pre-wrap; }
        .et-preview-link { color: var(--accent); text-decoration: none; font-size: 0.875rem; font-weight: 500; }
        .et-preview-link:hover { text-decoration: underline; }
        .et-preview-video { width: 100%; max-height: 18.75rem; border-radius: 12px; }
        .et-file-preview { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: var(--success-subtle); border: 1px solid var(--success-subtle); border-radius: 12px; box-shadow: var(--shadow-outset-sm); }
        .et-file-icon { font-size: 1.75rem; }
        .et-file-info { flex: 1; min-width: 0; }
        .et-file-name { font-weight: 600; color: var(--text-primary); font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .et-file-meta { font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.125rem; }
        .et-delivery-form { background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-default); padding: 1.25rem; box-shadow: var(--shadow-outset); }
        .et-delivery-form h3 { font-size: 1.125rem; color: var(--text-primary); margin: 0 0 1rem 0; font-family: 'Outfit', sans-serif; }
        .et-type-selector { margin-bottom: 1rem; }
        .et-type-selector > label { display: block; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); margin-bottom: 0.5rem; }
        .et-type-options { display: flex; gap: 0.5rem; flex-wrap: wrap; }
        .et-type-option { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding: 0.75rem 1rem; border: 2px solid var(--border-default); border-radius: 10px; background: var(--bg-elevated); cursor: pointer; transition: all 0.2s; min-width: 5.625rem; box-shadow: var(--shadow-outset-sm); }
        .et-type-option:hover { border-color: var(--accent-medium); background: var(--accent-subtle); }
        .et-type-selected { border-color: var(--accent); background: var(--accent-subtle); }
        .et-type-icon { font-size: 1.375rem; }
        .et-type-label { font-size: 0.75rem; font-weight: 500; color: var(--text-primary); }
        .et-form-group { margin-bottom: 1rem; }
        .et-form-group label { display: block; margin-bottom: 0.375rem; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
        .et-form-group textarea, .et-form-group input[type="url"] { width: 100%; padding: 0.75rem; border: 1px solid var(--border-default); border-radius: 12px; font-size: 0.875rem; outline: none; box-sizing: border-box; transition: border-color 0.2s; font-family: 'DM Sans', -apple-system, sans-serif; resize: vertical; }
        .et-form-group textarea:focus, .et-form-group input[type="url"]:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-subtle); }
        .et-input-error { border-color: var(--danger) !important; }
        .et-error-text { color: var(--danger); font-size: 0.75rem; margin-top: 0.25rem; display: block; }
        .et-preview-section { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 12px; padding: 0.75rem; margin-bottom: 1rem; box-shadow: var(--shadow-outset-sm); }
        .et-preview-section h4 { font-size: 0.8125rem; color: var(--text-secondary); margin: 0 0 0.5rem 0; font-family: 'Outfit', sans-serif; }
        .et-preview-text { color: var(--text-primary); font-size: 0.875rem; line-height: 1.6; margin: 0; white-space: pre-wrap; }
        .et-form-actions { display: flex; justify-content: flex-end; }
        .et-btn-submit { background: var(--accent); color: #fff; border: none; padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 0.875rem; cursor: pointer; font-weight: 500; transition: background 0.2s; box-shadow: var(--shadow-outset-sm); }
        .et-btn-submit:hover { background: var(--accent); filter: brightness(0.9); }
        .et-btn-submit:disabled { background: var(--accent-medium); cursor: not-allowed; box-shadow: none; }
        .et-deadline-warning { background: var(--warning-subtle); border: 1px solid var(--warning-subtle); border-radius: 12px; padding: 0.75rem 1rem; box-shadow: var(--shadow-outset-sm); }
        .et-deadline-warning p { color: var(--warning); margin: 0; font-size: 0.875rem; }
        @media (max-width: 768px) { .et-container { padding: 1rem; } .et-header-content h1 { font-size: 1.375rem; } .et-type-options { flex-direction: column; } .et-type-option { flex-direction: row; min-width: auto; } }
      `}</style>

      {error && <div className="et-error">{error}</div>}
      {success && <div className="et-success">{success}</div>}

      <div className="et-header">
        <Link to={`/course/${course?.id_curso || ''}`} className="et-btn-back">&larr; Volver al curso</Link>
        <div className="et-header-content">
          <h1>{task.titulo_tarea}</h1>
          {unit && <p className="et-unit-name">Unidad {unit.orden}: {unit.nombre_unidad}</p>}
          {course && <p className="et-course-name">{course.nombre_curso}</p>}
        </div>
      </div>

      <div className="et-details">
        <div className="et-detail-card">
          <h2>Detalles de la Tarea</h2>
          <div className="et-detail-section"><h3>Instrucciones</h3><p className="et-instructions">{task.instrucciones}</p></div>
          <div className="et-detail-row">
            <span className="et-detail-label">Fecha limite:</span>
            <span className={`et-deadline ${isPastDeadline ? 'et-deadline-passed' : ''}`}>
              {new Date(task.fecha_limite).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              {isPastDeadline && ' (Vencida)'}
            </span>
          </div>
          {task.criterios && <div className="et-detail-section"><h3>Criterios de Evaluacion</h3><p className="et-criteria">{task.criterios}</p></div>}
        </div>

        {existingDelivery && (
          <div className="et-existing-delivery">
            <h3>Tu Entrega</h3>
            <div className="et-delivery-info">
              <span className="et-delivery-date">Entregado: {new Date(existingDelivery.fecha_entrega).toLocaleString('es-ES')}</span>
              <span className={`et-type-badge et-type-${existingDelivery.tipo_entrega || 'texto'}`}>{existingDelivery.tipo_entrega || 'texto'}</span>
              {existingDelivery.calificacion !== null && <span className={`et-grade ${existingDelivery.calificacion >= 60 ? 'et-grade-pass' : 'et-grade-fail'}`}>Calificacion: {existingDelivery.calificacion}/100</span>}
              {existingDelivery.calificacion === null && <span className="et-grade-pending">Sin calificar</span>}
            </div>
            {existingDelivery.nota_docente && <div className="et-teacher-note"><h4>Comentario del docente:</h4><p>{existingDelivery.nota_docente}</p></div>}
            <div className="et-evidence-preview">
              <h4>Evidencia entregada:</h4>
              {existingDelivery.tipo_entrega === 'archivo' && existingDelivery.archivo_url && (
                <div className="et-file-preview">
                  <span className="et-file-icon">{getFileIcon(existingDelivery.archivo_tipo)}</span>
                  <div className="et-file-info">
                    <div className="et-file-name">{existingDelivery.archivo_nombre || 'Archivo'}</div>
                    <div className="et-file-meta">{formatFileSize(existingDelivery.archivo_tamano)}</div>
                  </div>
                  <a href={existingDelivery.archivo_url} target="_blank" rel="noopener noreferrer" className="et-preview-link">Ver archivo</a>
                </div>
              )}
              {existingDelivery.tipo_entrega === 'video' && (existingDelivery.evidencia?.includes('youtube') || existingDelivery.evidencia?.includes('vimeo')) ? (
                (() => {
                  let embedUrl = '';
                  if (existingDelivery.evidencia.includes('youtu.be')) embedUrl = 'https://www.youtube.com/embed/' + existingDelivery.evidencia.split('/').pop()?.split('?')[0];
                  else if (existingDelivery.evidencia.includes('youtube.com')) embedUrl = 'https://www.youtube.com/embed/' + new URL(existingDelivery.evidencia).searchParams.get('v');
                  else if (existingDelivery.evidencia.includes('vimeo.com')) embedUrl = 'https://player.vimeo.com/video/' + existingDelivery.evidencia.split('/').pop();
                  return embedUrl ? <iframe src={embedUrl} title="Entrega" className="et-preview-video" frameBorder="0" allowFullScreen /> : <p className="et-evidence-text">{existingDelivery.evidencia}</p>;
                })()
              ) : existingDelivery.tipo_entrega === 'documento' || existingDelivery.tipo_entrega === 'enlace' ? (
                <a href={existingDelivery.evidencia} target="_blank" rel="noopener noreferrer" className="et-preview-link">Abrir evidencia &#8599;</a>
              ) : existingDelivery.tipo_entrega === 'texto' ? <p className="et-evidence-text">{existingDelivery.evidencia}</p> : null}
            </div>
          </div>
        )}

        {!isPastDeadline && (
          <div className="et-delivery-form">
            <h3>{existingDelivery ? 'Re-entregar Tarea' : 'Entregar Tarea'}</h3>
            <div className="et-type-selector">
              <label>Tipo de entrega:</label>
              <div className="et-type-options">
                {DELIVERY_TYPES.map(type => (
                  <button key={type.id} type="button" className={`et-type-option ${deliveryType === type.id ? 'et-type-selected' : ''}`} onClick={() => { setDeliveryType(type.id); setEvidencia(''); }}>
                    <span className="et-type-icon">{type.icon}</span>
                    <span className="et-type-label">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              {deliveryType === 'texto' && (
                <div className="et-form-group">
                  <label>Tu respuesta</label>
                  <textarea value={evidencia} onChange={e => setEvidencia(e.target.value)} className={error && !evidencia.trim() ? 'et-input-error' : ''} placeholder={DELIVERY_TYPES.find(t => t.id === 'texto')?.placeholder} rows="8" required />
                  {error && !evidencia.trim() && <span className="et-error-text">El contenido es obligatorio</span>}
                </div>
              )}
              {deliveryType === 'documento' && <div className="et-form-group"><label>URL del documento</label><input type="url" value={evidencia} onChange={e => setEvidencia(e.target.value)} placeholder={DELIVERY_TYPES.find(t => t.id === 'documento')?.placeholder} required /></div>}
              {deliveryType === 'video' && <div className="et-form-group"><label>URL del video</label><input type="url" value={evidencia} onChange={e => setEvidencia(e.target.value)} placeholder={DELIVERY_TYPES.find(t => t.id === 'video')?.placeholder} required /></div>}
              {deliveryType === 'enlace' && <div className="et-form-group"><label>URL del enlace</label><input type="url" value={evidencia} onChange={e => setEvidencia(e.target.value)} placeholder={DELIVERY_TYPES.find(t => t.id === 'enlace')?.placeholder} required /></div>}
              {deliveryType === 'archivo' && (
                <div className="et-form-group">
                  <label>Subir archivo</label>
                  <FileUploader onUploadComplete={(fileInfo) => setUploadedFile(fileInfo)} onRemove={() => setUploadedFile(null)} existingFile={uploadedFile} accept="*/*" maxSizeMB={50} />
                  {error && !uploadedFile && <span className="et-error-text">Debes subir un archivo</span>}
                </div>
              )}
              {(deliveryType === 'texto' || deliveryType === 'documento' || deliveryType === 'enlace' || deliveryType === 'video') && evidencia.trim() && (
                <div className="et-preview-section"><h4>Vista previa:</h4>{renderPreview()}</div>
              )}
              <div className="et-form-actions">
                <button type="submit" className="et-btn-submit" disabled={submitting || (deliveryType === 'texto' && !evidencia.trim()) || (deliveryType === 'archivo' && !uploadedFile)}>
                  {submitting ? 'Entregando...' : existingDelivery ? 'Re-entregar' : 'Entregar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {isPastDeadline && !existingDelivery && <div className="et-deadline-warning"><p>El plazo de entrega ha vencido. No puedes entregar esta tarea.</p></div>}
        {isPastDeadline && existingDelivery && <div className="et-deadline-warning"><p>El plazo de entrega ha vencido. Ya no puedes re-entregar esta tarea.</p></div>}
      </div>
    </div>
  );
};

export default EntregaTarea;
