import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';
import FileUploader from '../../components/FileUploader';

const CourseContentManager = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [activeTab, setActiveTab] = useState('unidades');
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  const [units, setUnits] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [quizzes, setQuizzes] = useState([]);

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [unitForm, setUnitForm] = useState({ nombre_unidad: '', orden: '' });
  const [unitErrors, setUnitErrors] = useState({});

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [materialForm, setMaterialForm] = useState({ id_unidad: '', titulo_material: '', tipo_material: 'texto', contenido: '' });
  const [materialErrors, setMaterialErrors] = useState({});
  const [uploadedMaterialFile, setUploadedMaterialFile] = useState(null);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState({ id_unidad: '', titulo_tarea: '', instrucciones: '', fecha_limite: '', criterios: '' });
  const [taskErrors, setTaskErrors] = useState({});

  const [showQuizModal, setShowQuizModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizForm, setQuizForm] = useState({ id_unidad: '', titulo_cuestionario: '' });
  const [quizErrors, setQuizErrors] = useState({});

  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({ texto_pregunta: '', tipo: 'opcion_multiple', opciones: [], vf_correcta: null });
  const [questionErrors, setQuestionErrors] = useState({});

  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [optionForm, setOptionForm] = useState({ texto_opcion: '', es_correcta: false });
  const [optionErrors, setOptionErrors] = useState({});
  const [activeQuestionForOptions, setActiveQuestionForOptions] = useState(null);
  const [questionOptions, setQuestionOptions] = useState([]);

  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchCourse();
    fetchUnits();
  }, []);

  useEffect(() => {
    if (activeTab === 'materiales' && units.length > 0) {
      fetchMaterials();
    }
    if (activeTab === 'tareas' && units.length > 0) {
      fetchTasks();
    }
    if (activeTab === 'cuestionarios' && units.length > 0) {
      fetchQuizzes();
    }
  }, [activeTab, units]);

  const fetchCourse = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('cursos')
        .select('id_curso, nombre_curso, id_docente')
        .eq('id_curso', courseId)
        .single();

      if (fetchError) throw fetchError;
      if (usuarioId && data.id_docente !== usuarioId) {
        setError('No tienes permiso para gestionar este curso');
        return;
      }
      setCourse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('unidades')
        .select('*')
        .eq('id_curso', courseId)
        .order('orden', { ascending: true });

      if (fetchError) throw fetchError;
      setUnits(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchMaterials = async () => {
    try {
      const unitIds = (units || []).map((u) => u.id_unidad);
      if (unitIds.length === 0) { setMaterials([]); return; }
      const { data, error: fetchError } = await supabase
        .from('materiales')
        .select('*')
        .in('id_unidad', unitIds)
        .order('id_material', { ascending: false });

      if (fetchError) throw fetchError;
      setMaterials(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchTasks = async () => {
    try {
      const unitIds = (units || []).map((u) => u.id_unidad);
      if (unitIds.length === 0) { setTasks([]); return; }
      const { data, error: fetchError } = await supabase
        .from('tareas')
        .select('*')
        .in('id_unidad', unitIds)
        .order('id_tarea', { ascending: false });

      if (fetchError) throw fetchError;
      setTasks(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const unitIds = (units || []).map((u) => u.id_unidad);
      if (unitIds.length === 0) { setQuizzes([]); return; }
      const { data, error: fetchError } = await supabase
        .from('cuestionarios')
        .select('*')
        .in('id_unidad', unitIds)
        .order('id_cuestionario', { ascending: false });

      if (fetchError) throw fetchError;
      setQuizzes(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchQuizQuestions = async (quizId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('preguntas')
        .select('*')
        .eq('id_cuestionario', quizId)
        .order('id_pregunta', { ascending: true });

      if (fetchError) throw fetchError;
      setQuizQuestions(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchQuestionOptions = async (questionId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('opciones')
        .select('*')
        .eq('id_pregunta', questionId)
        .order('id_opcion', { ascending: true });

      if (fetchError) throw fetchError;
      setQuestionOptions(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const successTimeout = useRef(null);
  const clearSuccess = () => {
    if (successTimeout.current) clearTimeout(successTimeout.current);
    successTimeout.current = setTimeout(() => setSuccess(null), 4000);
  };

  const handleDelete = async (table, id, idField) => {
    setError(null);
    setSuccess(null);
    try {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq(idField, id);

      if (deleteError) throw deleteError;
      setSuccess('Elemento eliminado correctamente');
      setDeleteConfirm(null);
      if (table === 'unidades') fetchUnits();
      else if (table === 'materiales') fetchMaterials();
      else if (table === 'tareas') fetchTasks();
      else if (table === 'cuestionarios') fetchQuizzes();
      else if (table === 'preguntas') {
        fetchQuizQuestions(expandedQuiz);
      } else if (table === 'opciones') {
        fetchQuestionOptions(activeQuestionForOptions);
      }
      clearSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const validateUnitForm = () => {
    const errors = {};
    if (!unitForm.nombre_unidad.trim()) errors.nombre_unidad = 'El título es obligatorio';
    if (!unitForm.orden || parseInt(unitForm.orden) < 1) errors.orden = 'El orden debe ser mayor a 0';
    setUnitErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    if (!validateUnitForm()) return;

    setError(null);
    setSuccess(null);
    try {
      const unitData = {
        id_curso: parseInt(courseId),
        nombre_unidad: unitForm.nombre_unidad.trim(),
        orden: parseInt(unitForm.orden),
      };

      if (editingUnit) {
        const { error: updateError } = await supabase
          .from('unidades')
          .update(unitData)
          .eq('id_unidad', editingUnit.id_unidad);
        if (updateError) throw updateError;
        setSuccess('Unidad actualizada correctamente');
      } else {
        const { error: insertError } = await supabase
          .from('unidades')
          .insert([unitData]);
        if (insertError) throw insertError;
        setSuccess('Unidad creada correctamente');
      }

      setShowUnitModal(false);
      setEditingUnit(null);
      setUnitForm({ nombre_unidad: '', orden: '' });
      setUnitErrors({});
      fetchUnits();
      clearSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditUnit = (u) => {
    setEditingUnit(u);
    setUnitForm({ nombre_unidad: u.nombre_unidad, orden: u.orden.toString() });
    setUnitErrors({});
    setShowUnitModal(true);
  };

  const openCreateUnit = () => {
    setEditingUnit(null);
    setUnitForm({ nombre_unidad: '', orden: (units.length + 1).toString() });
    setUnitErrors({});
    setShowUnitModal(true);
  };

  const validateMaterialForm = () => {
    const errors = {};
    if (!materialForm.id_unidad) errors.id_unidad = 'Seleccione una unidad';
    if (!materialForm.titulo_material.trim()) errors.titulo_material = 'El título es obligatorio';
    if (!materialForm.tipo_material) errors.tipo_material = 'Seleccione un tipo';
    if (materialForm.tipo_material === 'documento' && !uploadedMaterialFile && !materialForm.contenido.trim()) {
      errors.contenido = 'Debe subir un archivo o proporcionar una URL';
    } else if (!materialForm.contenido.trim() && materialForm.tipo_material !== 'documento') {
      errors.contenido = 'El contenido es obligatorio';
    }
    setMaterialErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    if (!validateMaterialForm()) return;

    setError(null);
    setSuccess(null);
    try {
      const materialData = {
        id_unidad: parseInt(materialForm.id_unidad),
        titulo_material: materialForm.titulo_material.trim(),
        tipo_material: materialForm.tipo_material,
        contenido: (materialForm.tipo_material === 'documento' && uploadedMaterialFile) 
          ? uploadedMaterialFile.url 
          : materialForm.contenido.trim(),
      };

      if (editingMaterial) {
        const { error: updateError } = await supabase
          .from('materiales')
          .update(materialData)
          .eq('id_material', editingMaterial.id_material);
        if (updateError) throw updateError;
        setSuccess('Material actualizado correctamente');
      } else {
        const { error: insertError } = await supabase
          .from('materiales')
          .insert([materialData]);
        if (insertError) throw insertError;
        setSuccess('Material creado correctamente');
      }

      setShowMaterialModal(false);
      setEditingMaterial(null);
      setMaterialForm({ id_unidad: '', titulo_material: '', tipo_material: 'texto', contenido: '' });
      setUploadedMaterialFile(null);
      setMaterialErrors({});
      fetchMaterials();
      clearSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditMaterial = (m) => {
    setEditingMaterial(m);
    setMaterialForm({
      id_unidad: m.id_unidad.toString(),
      titulo_material: m.titulo_material,
      tipo_material: m.tipo_material,
      contenido: m.contenido,
    });
    setMaterialErrors({});
    setShowMaterialModal(true);
  };

  const openCreateMaterial = () => {
    setEditingMaterial(null);
    setMaterialForm({ id_unidad: units.length > 0 ? units[0].id_unidad.toString() : '', titulo_material: '', tipo_material: 'texto', contenido: '' });
    setUploadedMaterialFile(null);
    setMaterialErrors({});
    setShowMaterialModal(true);
  };

  const validateTaskForm = () => {
    const errors = {};
    if (!taskForm.id_unidad) errors.id_unidad = 'Seleccione una unidad';
    if (!taskForm.titulo_tarea.trim()) errors.titulo_tarea = 'El título es obligatorio';
    if (!taskForm.instrucciones.trim()) errors.instrucciones = 'Las instrucciones son obligatorias';
    if (!taskForm.fecha_limite) errors.fecha_limite = 'La fecha límite es obligatoria';
    setTaskErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!validateTaskForm()) return;

    setError(null);
    setSuccess(null);
    try {
      const taskData = {
        id_unidad: parseInt(taskForm.id_unidad),
        titulo_tarea: taskForm.titulo_tarea.trim(),
        instrucciones: taskForm.instrucciones.trim(),
        fecha_limite: taskForm.fecha_limite,
        criterios: taskForm.criterios.trim() || null,
      };

      if (editingTask) {
        const { error: updateError } = await supabase
          .from('tareas')
          .update(taskData)
          .eq('id_tarea', editingTask.id_tarea);
        if (updateError) throw updateError;
        setSuccess('Tarea actualizada correctamente');
      } else {
        const { error: insertError } = await supabase
          .from('tareas')
          .insert([taskData]);
        if (insertError) throw insertError;
        setSuccess('Tarea creada correctamente');
      }

      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ id_unidad: '', titulo_tarea: '', instrucciones: '', fecha_limite: '', criterios: '' });
      setTaskErrors({});
      fetchTasks();
      clearSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditTask = (t) => {
    setEditingTask(t);
    setTaskForm({
      id_unidad: t.id_unidad.toString(),
      titulo_tarea: t.titulo_tarea,
      instrucciones: t.instrucciones,
      fecha_limite: t.fecha_limite ? t.fecha_limite.slice(0, 16) : '',
      criterios: t.criterios || '',
    });
    setTaskErrors({});
    setShowTaskModal(true);
  };

  const openCreateTask = () => {
    setEditingTask(null);
    setTaskForm({ id_unidad: units.length > 0 ? units[0].id_unidad.toString() : '', titulo_tarea: '', instrucciones: '', fecha_limite: '', criterios: '' });
    setTaskErrors({});
    setShowTaskModal(true);
  };

  const validateQuizForm = () => {
    const errors = {};
    if (!quizForm.id_unidad) errors.id_unidad = 'Seleccione una unidad';
    if (!quizForm.titulo_cuestionario.trim()) errors.titulo_cuestionario = 'El título es obligatorio';
    setQuizErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    if (!validateQuizForm()) return;

    setError(null);
    setSuccess(null);
    try {
      const quizData = {
        id_unidad: parseInt(quizForm.id_unidad),
        titulo_cuestionario: quizForm.titulo_cuestionario.trim(),
      };

      if (editingQuiz) {
        const { error: updateError } = await supabase
          .from('cuestionarios')
          .update(quizData)
          .eq('id_cuestionario', editingQuiz.id_cuestionario);
        if (updateError) throw updateError;
        setSuccess('Cuestionario actualizado correctamente');
      } else {
        const { error: insertError } = await supabase
          .from('cuestionarios')
          .insert([quizData]);
        if (insertError) throw insertError;
        setSuccess('Cuestionario creado correctamente');
      }

      setShowQuizModal(false);
      setEditingQuiz(null);
      setQuizForm({ id_unidad: '', titulo_cuestionario: '' });
      setQuizErrors({});
      fetchQuizzes();
      clearSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditQuiz = (q) => {
    setEditingQuiz(q);
    setQuizForm({ id_unidad: q.id_unidad.toString(), titulo_cuestionario: q.titulo_cuestionario });
    setQuizErrors({});
    setShowQuizModal(true);
  };

  const openCreateQuiz = () => {
    setEditingQuiz(null);
    setQuizForm({ id_unidad: units.length > 0 ? units[0].id_unidad.toString() : '', titulo_cuestionario: '' });
    setQuizErrors({});
    setShowQuizModal(true);
  };

  const toggleQuizExpand = async (quiz) => {
    if (expandedQuiz === quiz.id_cuestionario) {
      setExpandedQuiz(null);
      setQuizQuestions([]);
    } else {
      setExpandedQuiz(quiz.id_cuestionario);
      await fetchQuizQuestions(quiz.id_cuestionario);
    }
  };

  const validateQuestionForm = () => {
    const errors = {};
    if (!questionForm.texto_pregunta.trim()) errors.texto_pregunta = 'La pregunta es obligatoria';
    if (!questionForm.tipo) errors.tipo = 'Seleccione un tipo';
    if (questionForm.tipo === 'opcion_multiple') {
      const opts = questionForm.opciones || [];
      if (opts.length < 2) errors.opciones = 'Agrega al menos 2 opciones';
      if (!opts.some(o => o.es_correcta)) errors.opciones = 'Selecciona una respuesta correcta';
      if (opts.some(o => !o.texto_opcion.trim())) errors.opciones = 'Todas las opciones deben tener texto';
    }
    if (questionForm.tipo === 'verdadero_falso') {
      if (questionForm.vf_correcta === null || questionForm.vf_correcta === undefined) errors.vf_correcta = 'Selecciona Verdadero o Falso';
    }
    setQuestionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!validateQuestionForm()) return;

    setError(null);
    setSuccess(null);
    try {
      const questionData = {
        id_cuestionario: expandedQuiz,
        texto_pregunta: questionForm.texto_pregunta.trim(),
        tipo: questionForm.tipo,
      };

      let questionId;

      if (editingQuestion) {
        const { error: updateError } = await supabase
          .from('preguntas')
          .update(questionData)
          .eq('id_pregunta', editingQuestion.id_pregunta);
        if (updateError) throw updateError;
        questionId = editingQuestion.id_pregunta;
        setSuccess('Pregunta actualizada correctamente');
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('preguntas')
          .insert([questionData])
          .select('id_pregunta')
          .single();
        if (insertError) throw insertError;
        questionId = inserted.id_pregunta;
        setSuccess('Pregunta creada correctamente');
      }

      if (questionForm.tipo === 'opcion_multiple') {
        if (editingQuestion) {
          await supabase.from('opciones').delete().eq('id_pregunta', questionId);
        }
        for (const opt of (questionForm.opciones || [])) {
          await supabase.from('opciones').insert([{
            id_pregunta: questionId,
            texto_opcion: opt.texto_opcion.trim(),
            es_correcta: opt.es_correcta,
          }]);
        }
      } else if (questionForm.tipo === 'verdadero_falso') {
        if (editingQuestion) {
          await supabase.from('opciones').delete().eq('id_pregunta', questionId);
        }
        await supabase.from('opciones').insert([
          { id_pregunta: questionId, texto_opcion: 'Verdadero', es_correcta: questionForm.vf_correcta === true },
          { id_pregunta: questionId, texto_opcion: 'Falso', es_correcta: questionForm.vf_correcta === false },
        ]);
      }

      setShowQuestionForm(false);
      setEditingQuestion(null);
      setQuestionForm({ texto_pregunta: '', tipo: 'opcion_multiple', opciones: [], vf_correcta: null });
      setQuestionErrors({});
      fetchQuizQuestions(expandedQuiz);
      clearSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditQuestion = (q) => {
    setEditingQuestion(q);
    setQuestionForm({ texto_pregunta: q.texto_pregunta, tipo: q.tipo, opciones: [], vf_correcta: null });
    setQuestionErrors({});
    setShowQuestionForm(true);
  };

  const openCreateQuestion = () => {
    setEditingQuestion(null);
    setQuestionForm({ texto_pregunta: '', tipo: 'opcion_multiple', opciones: [], vf_correcta: null });
    setQuestionErrors({});
    setShowQuestionForm(true);
  };

  const openManageOptions = async (question) => {
    setActiveQuestionForOptions(question.id_pregunta);
    setShowOptionForm(false);
    setEditingOption(null);
    setOptionForm({ texto_opcion: '', es_correcta: false });
    setOptionErrors({});
    await fetchQuestionOptions(question.id_pregunta);
  };

  const validateOptionForm = () => {
    const errors = {};
    if (!optionForm.texto_opcion.trim()) errors.texto_opcion = 'El texto de la opción es obligatorio';
    setOptionErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOptionSubmit = async (e) => {
    e.preventDefault();
    if (!validateOptionForm()) return;

    setError(null);
    setSuccess(null);
    try {
      const optionData = {
        id_pregunta: activeQuestionForOptions,
        texto_opcion: optionForm.texto_opcion.trim(),
        es_correcta: optionForm.es_correcta,
      };

      if (editingOption) {
        const { error: updateError } = await supabase
          .from('opciones')
          .update(optionData)
          .eq('id_opcion', editingOption.id_opcion);
        if (updateError) throw updateError;
        setSuccess('Opción actualizada correctamente');
      } else {
        const { error: insertError } = await supabase
          .from('opciones')
          .insert([optionData]);
        if (insertError) throw insertError;
        setSuccess('Opción creada correctamente');
      }

      setShowOptionForm(false);
      setEditingOption(null);
      setOptionForm({ texto_opcion: '', es_correcta: false });
      setOptionErrors({});
      fetchQuestionOptions(activeQuestionForOptions);
      clearSuccess();
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditOption = (o) => {
    setEditingOption(o);
    setOptionForm({ texto_opcion: o.texto_opcion, es_correcta: o.es_correcta });
    setOptionErrors({});
    setShowOptionForm(true);
  };

  const openCreateOption = () => {
    setEditingOption(null);
    setOptionForm({ texto_opcion: '', es_correcta: false });
    setOptionErrors({});
    setShowOptionForm(true);
  };

  const getUnitName = (unitId) => {
    const unit = units.find((u) => u.id_unidad === unitId);
    return unit ? unit.nombre_unidad : 'Sin unidad';
  };

  const getTipoLabel = (tipo) => {
    const labels = { texto: 'Texto', enlace: 'Enlace', video: 'Video', documento: 'Documento' };
    return labels[tipo] || tipo;
  };

  const getTipoBadgeClass = (tipo) => {
    const classes = { texto: 'ccm-badge-texto', enlace: 'ccm-badge-enlace', video: 'ccm-badge-video', documento: 'ccm-badge-documento' };
    return classes[tipo] || '';
  };

  if (loading) {
    return <div className="ccm-loading">Cargando contenido del curso...</div>;
  }

  if (!course) {
    return (
      <div className="ccm-error">
        <p>Curso no encontrado o no tienes permiso para gestionarlo.</p>
        <button className="ccm-btn-primary" onClick={() => navigate('/docente/my-courses')}>
          Volver a Mis Cursos
        </button>
      </div>
    );
  }

  return (
    <div className="ccm">
      <div className="ccm-header">
        <div>
          <button className="ccm-back-btn" onClick={() => navigate('/docente/my-courses')}>
            ← Volver
          </button>
          <h1>Gestionar Contenido: {course.nombre_curso}</h1>
        </div>
      </div>

      {error && <div className="ccm-error-message">{error}</div>}
      {success && <div className="ccm-success-message">{success}</div>}

      <div className="ccm-tabs">
        <button
          className={`ccm-tab ${activeTab === 'unidades' ? 'ccm-tab-active' : ''}`}
          onClick={() => setActiveTab('unidades')}
        >
          Unidades
        </button>
        <button
          className={`ccm-tab ${activeTab === 'materiales' ? 'ccm-tab-active' : ''}`}
          onClick={() => setActiveTab('materiales')}
        >
          Materiales
        </button>
        <button
          className={`ccm-tab ${activeTab === 'tareas' ? 'ccm-tab-active' : ''}`}
          onClick={() => setActiveTab('tareas')}
        >
          Tareas
        </button>
        <button
          className={`ccm-tab ${activeTab === 'cuestionarios' ? 'ccm-tab-active' : ''}`}
          onClick={() => setActiveTab('cuestionarios')}
        >
          Cuestionarios
        </button>
      </div>

      <div className="ccm-tab-content">
        {activeTab === 'unidades' && (
          <div className="ccm-section">
            <div className="ccm-section-header">
              <h2>Unidades del Curso</h2>
              <button className="ccm-btn-primary" onClick={openCreateUnit}>
                + Nueva Unidad
              </button>
            </div>
            {units.length === 0 ? (
              <p className="ccm-no-data">No hay unidades creadas</p>
            ) : (
              <div className="ccm-table-container">
                <table className="ccm-table">
                  <thead>
                    <tr>
                      <th>Orden</th>
                      <th>Título</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {units.map((u) => (
                      <tr key={u.id_unidad}>
                        <td>{u.orden}</td>
                        <td>{u.nombre_unidad}</td>
                        <td className="ccm-actions-cell">
                          <button className="ccm-btn-edit" onClick={() => openEditUnit(u)}>Editar</button>
                          <button className="ccm-btn-delete" onClick={() => setDeleteConfirm({ table: 'unidades', id: u.id_unidad, idField: 'id_unidad', label: u.nombre_unidad })}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'materiales' && (
          <div className="ccm-section">
            <div className="ccm-section-header">
              <h2>Materiales</h2>
              <button className="ccm-btn-primary" onClick={openCreateMaterial}>
                + Nuevo Material
              </button>
            </div>
            {units.length === 0 ? (
              <p className="ccm-no-data">Cree una unidad primero para agregar materiales</p>
            ) : materials.length === 0 ? (
              <p className="ccm-no-data">No hay materiales creados</p>
            ) : (
              <div className="ccm-table-container">
                <table className="ccm-table">
                  <thead>
                    <tr>
                      <th>Unidad</th>
                      <th>Título</th>
                      <th>Tipo</th>
                      <th>Contenido</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((m) => (
                      <tr key={m.id_material}>
                        <td>{getUnitName(m.id_unidad)}</td>
                        <td>{m.titulo_material}</td>
                        <td>
                          <span className={`ccm-badge ${getTipoBadgeClass(m.tipo_material)}`}>
                            {getTipoLabel(m.tipo_material)}
                          </span>
                        </td>
                        <td className="ccm-content-cell">{m.contenido}</td>
                        <td className="ccm-actions-cell">
                          <button className="ccm-btn-edit" onClick={() => openEditMaterial(m)}>Editar</button>
                          <button className="ccm-btn-delete" onClick={() => setDeleteConfirm({ table: 'materiales', id: m.id_material, idField: 'id_material', label: m.titulo_material })}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tareas' && (
          <div className="ccm-section">
            <div className="ccm-section-header">
              <h2>Tareas</h2>
              <button className="ccm-btn-primary" onClick={openCreateTask}>
                + Nueva Tarea
              </button>
            </div>
            {units.length === 0 ? (
              <p className="ccm-no-data">Cree una unidad primero para agregar tareas</p>
            ) : tasks.length === 0 ? (
              <p className="ccm-no-data">No hay tareas creadas</p>
            ) : (
              <div className="ccm-table-container">
                <table className="ccm-table">
                  <thead>
                    <tr>
                      <th>Unidad</th>
                      <th>Título</th>
                      <th>Fecha Límite</th>
                      <th>Criterios</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr key={t.id_tarea}>
                        <td>{getUnitName(t.id_unidad)}</td>
                        <td>{t.titulo_tarea}</td>
                        <td>{t.fecha_limite ? new Date(t.fecha_limite).toLocaleDateString('es-ES') : '-'}</td>
                        <td className="ccm-content-cell">{t.criterios || '-'}</td>
                        <td className="ccm-actions-cell">
                          <button className="ccm-btn-edit" onClick={() => openEditTask(t)}>Editar</button>
                          <button className="ccm-btn-delete" onClick={() => setDeleteConfirm({ table: 'tareas', id: t.id_tarea, idField: 'id_tarea', label: t.titulo_tarea })}>Eliminar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cuestionarios' && (
          <div className="ccm-section">
            <div className="ccm-section-header">
              <h2>Cuestionarios</h2>
              <button className="ccm-btn-primary" onClick={openCreateQuiz}>
                + Nuevo Cuestionario
              </button>
            </div>
            {units.length === 0 ? (
              <p className="ccm-no-data">Cree una unidad primero para agregar cuestionarios</p>
            ) : quizzes.length === 0 ? (
              <p className="ccm-no-data">No hay cuestionarios creados</p>
            ) : (
              <div className="ccm-quiz-list">
                {quizzes.map((q) => (
                  <div key={q.id_cuestionario} className="ccm-quiz-item">
                    <div className="ccm-quiz-header" onClick={() => toggleQuizExpand(q)}>
                      <div className="ccm-quiz-info">
                        <span className="ccm-quiz-expand">{expandedQuiz === q.id_cuestionario ? '▼' : '▶'}</span>
                        <h3>{q.titulo_cuestionario}</h3>
                        <span className="ccm-quiz-unit">{getUnitName(q.id_unidad)}</span>
                      </div>
                      <div className="ccm-quiz-actions">
                        <button className="ccm-btn-edit" onClick={(e) => { e.stopPropagation(); openEditQuiz(q); }}>Editar</button>
                        <button className="ccm-btn-delete" onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ table: 'cuestionarios', id: q.id_cuestionario, idField: 'id_cuestionario', label: q.titulo_cuestionario }); }}>Eliminar</button>
                      </div>
                    </div>

                    {expandedQuiz === q.id_cuestionario && (
                      <div className="ccm-quiz-detail">
                        <div className="ccm-questions-header">
                          <h4>Preguntas</h4>
                          <button className="ccm-btn-sm-primary" onClick={openCreateQuestion}>
                            + Pregunta
                          </button>
                        </div>

                        {showQuestionForm && (
                          <div className="ccm-question-form-card">
                            <h4>{editingQuestion ? 'Editar Pregunta' : 'Nueva Pregunta'}</h4>
                            <form onSubmit={handleQuestionSubmit}>
                              <div className="ccm-form-group">
                                <label>Tipo de Pregunta</label>
                                <div className="ccm-question-type-selector">
                                  {[
                                    { id: 'opcion_multiple', icon: '📋', label: 'Opción Múltiple', desc: 'Varias opciones con una correcta' },
                                    { id: 'verdadero_falso', icon: '✅', label: 'Verdadero / Falso', desc: 'Solo verdadero o falso' },
                                  ].map(type => (
                                    <button
                                      key={type.id}
                                      type="button"
                                      className={`ccm-question-type-btn ${questionForm.tipo === type.id ? 'ccm-question-type-selected' : ''}`}
                                      onClick={() => setQuestionForm((p) => ({ ...p, tipo: type.id }))}
                                    >
                                      <span className="ccm-question-type-icon">{type.icon}</span>
                                      <span className="ccm-question-type-label">{type.label}</span>
                                      <span className="ccm-question-type-desc">{type.desc}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="ccm-form-group">
                                <label>Texto de la Pregunta</label>
                                <textarea
                                  value={questionForm.texto_pregunta}
                                  onChange={(e) => setQuestionForm((p) => ({ ...p, texto_pregunta: e.target.value }))}
                                  className={questionErrors.texto_pregunta ? 'ccm-input-error' : ''}
                                  placeholder="Escriba la pregunta..."
                                  rows="3"
                                />
                                {questionErrors.texto_pregunta && <span className="ccm-error-text">{questionErrors.texto_pregunta}</span>}
                              </div>

                              {questionForm.tipo === 'opcion_multiple' && (
                                <div className="ccm-question-options-panel">
                                  <div className="ccm-panel-header">
                                    <h5>Opciones de Respuesta</h5>
                                    <button type="button" className="ccm-btn-add-option" onClick={() => {
                                      const currentOptions = questionForm.opciones || [];
                                      if (currentOptions.length >= 6) return;
                                      setQuestionForm(p => ({
                                        ...p,
                                        opciones: [...currentOptions, { texto_opcion: '', es_correcta: false }]
                                      }));
                                    }}>
                                      + Agregar Opción
                                    </button>
                                  </div>
                                  {(questionForm.opciones || []).length === 0 && (
                                    <p className="ccm-hint-text">Agrega al menos 2 opciones de respuesta</p>
                                  )}
                                  {(questionForm.opciones || []).map((opt, idx) => (
                                    <div key={idx} className="ccm-option-row">
                                      <span className="ccm-option-letter">{String.fromCharCode(65 + idx)}</span>
                                      <input
                                        type="text"
                                        value={opt.texto_opcion}
                                        onChange={(e) => {
                                          const newOpts = [...(questionForm.opciones || [])];
                                          newOpts[idx] = { ...newOpts[idx], texto_opcion: e.target.value };
                                          setQuestionForm(p => ({ ...p, opciones: newOpts }));
                                        }}
                                        className="ccm-option-input"
                                        placeholder={`Opción ${String.fromCharCode(65 + idx)}`}
                                      />
                                      <label className="ccm-option-correct">
                                        <input
                                          type="radio"
                                          name="correct-option"
                                          checked={opt.es_correcta}
                                          onChange={() => {
                                            const newOpts = (questionForm.opciones || []).map((o, i) => ({
                                              ...o,
                                              es_correcta: i === idx
                                            }));
                                            setQuestionForm(p => ({ ...p, opciones: newOpts }));
                                          }}
                                        />
                                        Correcta
                                      </label>
                                      <button
                                        type="button"
                                        className="ccm-btn-remove-option"
                                        onClick={() => {
                                          const newOpts = (questionForm.opciones || []).filter((_, i) => i !== idx);
                                          setQuestionForm(p => ({ ...p, opciones: newOpts }));
                                        }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {questionForm.tipo === 'verdadero_falso' && (
                                <div className="ccm-vf-panel">
                                  <h5>Selecciona la respuesta correcta</h5>
                                  <div className="ccm-vf-options">
                                    <button
                                      type="button"
                                      className={`ccm-vf-btn ${questionForm.vf_correcta === true ? 'ccm-vf-selected' : ''}`}
                                      onClick={() => setQuestionForm(p => ({ ...p, vf_correcta: true }))}
                                    >
                                      ✅ Verdadero
                                    </button>
                                    <button
                                      type="button"
                                      className={`ccm-vf-btn ${questionForm.vf_correcta === false ? 'ccm-vf-selected' : ''}`}
                                      onClick={() => setQuestionForm(p => ({ ...p, vf_correcta: false }))}
                                    >
                                      ❌ Falso
                                    </button>
                                  </div>
                                </div>
                              )}

                              <div className="ccm-form-actions">
                                <button type="button" className="ccm-btn-secondary" onClick={() => { setShowQuestionForm(false); setEditingQuestion(null); }}>Cancelar</button>
                                <button type="submit" className="ccm-btn-primary">
                                  {editingQuestion ? 'Actualizar' : 'Crear'}
                                </button>
                              </div>
                            </form>
                          </div>
                        )}

                        {quizQuestions.length === 0 ? (
                          <p className="ccm-no-data">No hay preguntas en este cuestionario</p>
                        ) : (
                          <div className="ccm-questions-list">
                            {quizQuestions.map((qst) => (
                              <div key={qst.id_pregunta} className="ccm-question-card">
                                <div className="ccm-question-header">
                                  <div>
                                    <strong>{qst.texto_pregunta}</strong>
                                    <span className={`ccm-badge ccm-badge-${qst.tipo === 'opcion_multiple' ? 'texto' : 'enlace'}`}>
                                      {qst.tipo === 'opcion_multiple' ? 'Opción múltiple' : 'V/F'}
                                    </span>
                                  </div>
                                  <div className="ccm-question-actions">
                                    {qst.tipo === 'opcion_multiple' && (
                                      <button className="ccm-btn-sm" onClick={() => openManageOptions(qst)}>Opciones</button>
                                    )}
                                    <button className="ccm-btn-edit" onClick={() => openEditQuestion(qst)}>Editar</button>
                                    <button className="ccm-btn-delete" onClick={() => setDeleteConfirm({ table: 'preguntas', id: qst.id_pregunta, idField: 'id_pregunta', label: qst.texto_pregunta.substring(0, 30) + '...' })}>Eliminar</button>
                                  </div>
                                </div>

                                {qst.tipo !== 'abierta' && activeQuestionForOptions === qst.id_pregunta && (
                                  <div className="ccm-options-section">
                                    <div className="ccm-options-header">
                                      <h5>Opciones de Respuesta</h5>
                                      <button className="ccm-btn-sm-primary" onClick={openCreateOption}>
                                        + Opción
                                      </button>
                                    </div>

                                    {showOptionForm && (
                                      <div className="ccm-option-form-card">
                                        <h5>{editingOption ? 'Editar Opción' : 'Nueva Opción'}</h5>
                                        <form onSubmit={handleOptionSubmit}>
                                          <div className="ccm-form-group">
                                            <label>Texto de la Opción</label>
                                            <input
                                              type="text"
                                              value={optionForm.texto_opcion}
                                              onChange={(e) => setOptionForm((p) => ({ ...p, texto_opcion: e.target.value }))}
                                              className={optionErrors.texto_opcion ? 'ccm-input-error' : ''}
                                              placeholder="Texto de la opción..."
                                            />
                                            {optionErrors.texto_opcion && <span className="ccm-error-text">{optionErrors.texto_opcion}</span>}
                                          </div>
                                          <div className="ccm-form-group ccm-checkbox-group">
                                            <label>
                                              <input
                                                type="checkbox"
                                                checked={optionForm.es_correcta}
                                                onChange={(e) => setOptionForm((p) => ({ ...p, es_correcta: e.target.checked }))}
                                              />
                                              Respuesta correcta
                                            </label>
                                          </div>
                                          <div className="ccm-form-actions">
                                            <button type="button" className="ccm-btn-secondary" onClick={() => { setShowOptionForm(false); setEditingOption(null); }}>Cancelar</button>
                                            <button type="submit" className="ccm-btn-primary">
                                              {editingOption ? 'Actualizar' : 'Crear'}
                                            </button>
                                          </div>
                                        </form>
                                      </div>
                                    )}

                                    {questionOptions.length === 0 ? (
                                      <p className="ccm-no-data">No hay opciones para esta pregunta</p>
                                    ) : (
                                      <div className="ccm-options-list">
                                        {questionOptions.map((opt) => (
                                          <div key={opt.id_opcion} className={`ccm-option-item ${opt.es_correcta ? 'ccm-option-correct' : ''}`}>
                                            <span className="ccm-option-text">{opt.texto_opcion}</span>
                                            {opt.es_correcta && <span className="ccm-correct-badge">✓ Correcta</span>}
                                            <div className="ccm-option-actions">
                                              <button className="ccm-btn-edit" onClick={() => openEditOption(opt)}>Editar</button>
                                              <button className="ccm-btn-delete" onClick={() => setDeleteConfirm({ table: 'opciones', id: opt.id_opcion, idField: 'id_opcion', label: opt.texto_opcion.substring(0, 30) + '...' })}>Eliminar</button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showUnitModal && (
        <div className="ccm-modal-overlay" onClick={() => setShowUnitModal(false)}>
          <div className="ccm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ccm-modal-header">
              <h2>{editingUnit ? 'Editar Unidad' : 'Nueva Unidad'}</h2>
              <button className="ccm-modal-close" onClick={() => setShowUnitModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleUnitSubmit}>
              <div className="ccm-form-group">
                <label>Título de la Unidad</label>
                <input
                  type="text"
                  value={unitForm.nombre_unidad}
                  onChange={(e) => setUnitForm((p) => ({ ...p, nombre_unidad: e.target.value }))}
                  className={unitErrors.nombre_unidad ? 'ccm-input-error' : ''}
                  placeholder="Ej: Introducción al curso"
                />
                {unitErrors.nombre_unidad && <span className="ccm-error-text">{unitErrors.nombre_unidad}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Orden</label>
                <input
                  type="number"
                  value={unitForm.orden}
                  onChange={(e) => setUnitForm((p) => ({ ...p, orden: e.target.value }))}
                  className={unitErrors.orden ? 'ccm-input-error' : ''}
                  placeholder="1"
                  min="1"
                />
                {unitErrors.orden && <span className="ccm-error-text">{unitErrors.orden}</span>}
              </div>
              <div className="ccm-modal-actions">
                <button type="button" className="ccm-btn-secondary" onClick={() => setShowUnitModal(false)}>Cancelar</button>
                <button type="submit" className="ccm-btn-primary">{editingUnit ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaterialModal && (
        <div className="ccm-modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="ccm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ccm-modal-header">
              <h2>{editingMaterial ? 'Editar Material' : 'Nuevo Material'}</h2>
              <button className="ccm-modal-close" onClick={() => setShowMaterialModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleMaterialSubmit}>
              <div className="ccm-form-group">
                <label>Unidad</label>
                <select
                  value={materialForm.id_unidad}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, id_unidad: e.target.value }))}
                  className={materialErrors.id_unidad ? 'ccm-input-error' : ''}
                >
                  <option value="">Seleccione una unidad</option>
                  {units.map((u) => (
                    <option key={u.id_unidad} value={u.id_unidad}>{u.nombre_unidad}</option>
                  ))}
                </select>
                {materialErrors.id_unidad && <span className="ccm-error-text">{materialErrors.id_unidad}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Título del Material</label>
                <input
                  type="text"
                  value={materialForm.titulo_material}
                  onChange={(e) => setMaterialForm((p) => ({ ...p, titulo_material: e.target.value }))}
                  className={materialErrors.titulo_material ? 'ccm-input-error' : ''}
                  placeholder="Ej: Guía de estudio"
                />
                {materialErrors.titulo_material && <span className="ccm-error-text">{materialErrors.titulo_material}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Tipo de Material</label>
                <div className="ccm-material-type-selector">
                  {[
                    { id: 'texto', icon: '📝', label: 'Texto' },
                    { id: 'enlace', icon: '🔗', label: 'Enlace' },
                    { id: 'video', icon: '🎬', label: 'Video' },
                    { id: 'documento', icon: '📄', label: 'Documento' },
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      className={`ccm-material-type-btn ${materialForm.tipo_material === type.id ? 'ccm-material-type-selected' : ''}`}
                      onClick={() => setMaterialForm(p => ({ ...p, tipo_material: type.id }))}
                    >
                      <span className="ccm-material-type-icon">{type.icon}</span>
                      <span className="ccm-material-type-label">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="ccm-form-group">
                <label>
                  {materialForm.tipo_material === 'texto' ? 'Contenido del material' :
                   materialForm.tipo_material === 'video' ? 'URL del video' :
                   materialForm.tipo_material === 'enlace' ? 'URL del enlace' : 'Subir archivo del documento'}
                </label>
                {materialForm.tipo_material === 'documento' ? (
                  <div className="ccm-file-upload-container">
                    <FileUploader 
                      bucket="materiales"
                      onUploadComplete={(file) => {
                        setUploadedMaterialFile(file);
                        setMaterialForm(p => ({ ...p, contenido: file.url }));
                      }}
                      onRemove={() => {
                        setUploadedMaterialFile(null);
                        setMaterialForm(p => ({ ...p, contenido: '' }));
                      }}
                      existingFile={uploadedMaterialFile || (editingMaterial && materialForm.tipo_material === 'documento' ? { url: materialForm.contenido, name: 'Archivo actual' } : null)}
                    />
                  </div>
                ) : (
                  <textarea
                    value={materialForm.contenido}
                    onChange={(e) => setMaterialForm((p) => ({ ...p, contenido: e.target.value }))}
                    className={materialErrors.contenido ? 'ccm-input-error' : ''}
                    placeholder={
                      materialForm.tipo_material === 'texto' ? 'Escribe el contenido del material...' :
                      materialForm.tipo_material === 'video' ? 'https://youtube.com/watch?v=...' :
                      'https://...'
                    }
                    rows="4"
                  />
                )}
                {materialErrors.contenido && <span className="ccm-error-text">{materialErrors.contenido}</span>}
              </div>
              <div className="ccm-modal-actions">
                <button type="button" className="ccm-btn-secondary" onClick={() => setShowMaterialModal(false)}>Cancelar</button>
                <button type="submit" className="ccm-btn-primary">{editingMaterial ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTaskModal && (
        <div className="ccm-modal-overlay" onClick={() => setShowTaskModal(false)}>
          <div className="ccm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ccm-modal-header">
              <h2>{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button className="ccm-modal-close" onClick={() => setShowTaskModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="ccm-form-group">
                <label>Unidad</label>
                <select
                  value={taskForm.id_unidad}
                  onChange={(e) => setTaskForm((p) => ({ ...p, id_unidad: e.target.value }))}
                  className={taskErrors.id_unidad ? 'ccm-input-error' : ''}
                >
                  <option value="">Seleccione una unidad</option>
                  {units.map((u) => (
                    <option key={u.id_unidad} value={u.id_unidad}>{u.nombre_unidad}</option>
                  ))}
                </select>
                {taskErrors.id_unidad && <span className="ccm-error-text">{taskErrors.id_unidad}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Título de la Tarea</label>
                <input
                  type="text"
                  value={taskForm.titulo_tarea}
                  onChange={(e) => setTaskForm((p) => ({ ...p, titulo_tarea: e.target.value }))}
                  className={taskErrors.titulo_tarea ? 'ccm-input-error' : ''}
                  placeholder="Ej: Ejercicios capítulo 1"
                />
                {taskErrors.titulo_tarea && <span className="ccm-error-text">{taskErrors.titulo_tarea}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Instrucciones</label>
                <textarea
                  value={taskForm.instrucciones}
                  onChange={(e) => setTaskForm((p) => ({ ...p, instrucciones: e.target.value }))}
                  className={taskErrors.instrucciones ? 'ccm-input-error' : ''}
                  placeholder="Instrucciones detalladas de la tarea"
                  rows="4"
                />
                {taskErrors.instrucciones && <span className="ccm-error-text">{taskErrors.instrucciones}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Fecha Límite</label>
                <input
                  type="datetime-local"
                  value={taskForm.fecha_limite}
                  onChange={(e) => setTaskForm((p) => ({ ...p, fecha_limite: e.target.value }))}
                  className={taskErrors.fecha_limite ? 'ccm-input-error' : ''}
                />
                {taskErrors.fecha_limite && <span className="ccm-error-text">{taskErrors.fecha_limite}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Criterios de Evaluación</label>
                <textarea
                  value={taskForm.criterios}
                  onChange={(e) => setTaskForm((p) => ({ ...p, criterios: e.target.value }))}
                  placeholder="Criterios para calificar la tarea"
                  rows="3"
                />
              </div>
              <div className="ccm-modal-actions">
                <button type="button" className="ccm-btn-secondary" onClick={() => setShowTaskModal(false)}>Cancelar</button>
                <button type="submit" className="ccm-btn-primary">{editingTask ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuizModal && (
        <div className="ccm-modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="ccm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ccm-modal-header">
              <h2>{editingQuiz ? 'Editar Cuestionario' : 'Nuevo Cuestionario'}</h2>
              <button className="ccm-modal-close" onClick={() => setShowQuizModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleQuizSubmit}>
              <div className="ccm-form-group">
                <label>Unidad</label>
                <select
                  value={quizForm.id_unidad}
                  onChange={(e) => setQuizForm((p) => ({ ...p, id_unidad: e.target.value }))}
                  className={quizErrors.id_unidad ? 'ccm-input-error' : ''}
                >
                  <option value="">Seleccione una unidad</option>
                  {units.map((u) => (
                    <option key={u.id_unidad} value={u.id_unidad}>{u.nombre_unidad}</option>
                  ))}
                </select>
                {quizErrors.id_unidad && <span className="ccm-error-text">{quizErrors.id_unidad}</span>}
              </div>
              <div className="ccm-form-group">
                <label>Título del Cuestionario</label>
                <input
                  type="text"
                  value={quizForm.titulo_cuestionario}
                  onChange={(e) => setQuizForm((p) => ({ ...p, titulo_cuestionario: e.target.value }))}
                  className={quizErrors.titulo_cuestionario ? 'ccm-input-error' : ''}
                  placeholder="Ej: Examen parcial 1"
                />
                {quizErrors.titulo_cuestionario && <span className="ccm-error-text">{quizErrors.titulo_cuestionario}</span>}
              </div>
              <div className="ccm-modal-actions">
                <button type="button" className="ccm-btn-secondary" onClick={() => setShowQuizModal(false)}>Cancelar</button>
                <button type="submit" className="ccm-btn-primary">{editingQuiz ? 'Actualizar' : 'Crear'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="ccm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="ccm-modal-content ccm-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="ccm-modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="ccm-modal-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
            </div>
            <p className="ccm-confirm-text">
              ¿Está seguro de eliminar <strong>{deleteConfirm.label}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="ccm-modal-actions">
              <button className="ccm-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</button>
              <button className="ccm-btn-delete" onClick={() => handleDelete(deleteConfirm.table, deleteConfirm.id, deleteConfirm.idField)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .ccm {
          padding: 0;
          max-width: 100%;
          margin: 0 auto;
        }
        .ccm-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 18px;
          color: var(--text-secondary);
        }
        .ccm-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
        }
        .ccm-error p {
          color: var(--danger);
          font-size: 16px;
        }
        .ccm-header {
          margin-bottom: 24px;
        }
        .ccm-back-btn {
          background: none;
          border: none;
          color: var(--accent);
          font-size: 14px;
          cursor: pointer;
          padding: 0;
          margin-bottom: 8px;
          font-weight: 500;
        }
        .ccm-back-btn:hover { text-decoration: underline; }
        .ccm-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          color: var(--text-primary);
          margin: 0;
        }
        .ccm-error-message {
          background: var(--danger-subtle);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .ccm-success-message {
          background: var(--success-subtle);
          color: var(--success);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .ccm-tabs {
          display: flex;
          gap: 4px;
          border-bottom: 2px solid var(--border-default);
          margin-bottom: 24px;
        }
        .ccm-tab {
          padding: 12px 24px;
          background: none;
          border: none;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
          transition: color 0.2s, border-color 0.2s;
        }
        .ccm-tab:hover { color: var(--text-primary); }
        .ccm-tab-active {
          color: var(--accent);
          border-bottom-color: var(--accent);
        }
        .ccm-tab-content {
          min-height: 300px;
        }
        .ccm-section {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-default);
        }
        .ccm-section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .ccm-section-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          color: var(--text-primary);
          margin: 0;
        }
        .ccm-no-data {
          color: var(--text-tertiary);
          text-align: center;
          padding: 32px;
        }
        .ccm-table-container {
          overflow-x: auto;
        }
        .ccm-table {
          width: 100%;
          border-collapse: collapse;
        }
        .ccm-table th,
        .ccm-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--border-default);
          font-size: 14px;
        }
        .ccm-table th {
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-weight: 600;
        }
        .ccm-table td {
          color: var(--text-secondary);
        }
        .ccm-content-cell {
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ccm-actions-cell {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .ccm-btn-primary {
          background: var(--accent);
          color: var(--bg-surface);
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .ccm-btn-primary:hover { background: var(--accent); }
        .ccm-btn-secondary {
          background: var(--bg-subtle);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .ccm-btn-secondary:hover { background: var(--border-default); }
        .ccm-btn-edit {
          background: var(--accent-subtle);
          color: var(--accent);
          border: none;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .ccm-btn-edit:hover { background: var(--accent-medium); }
        .ccm-btn-delete {
          background: var(--danger-subtle);
          color: var(--danger);
          border: none;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .ccm-btn-delete:hover { background: var(--danger-subtle); }
        .ccm-btn-sm {
          background: var(--accent-subtle);
          color: var(--accent);
          border: none;
          padding: 4px 10px;
          border-radius: 10px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 500;
        }
        .ccm-btn-sm:hover { background: var(--accent-medium); }
        .ccm-btn-sm-primary {
          background: var(--accent);
          color: var(--bg-surface);
          border: none;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .ccm-btn-sm-primary:hover { background: var(--accent); }
        .ccm-badge {
          display: inline-block;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .ccm-badge-texto { background: var(--accent-subtle); color: var(--accent); }
        .ccm-badge-enlace { background: var(--success-subtle); color: var(--success); }
        .ccm-badge-video { background: var(--warning-subtle); color: var(--warning); }
        .ccm-badge-documento { background: rgba(212, 107, 107, 0.1); color: var(--danger); }
        .ccm-quiz-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ccm-quiz-item {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          overflow: hidden;
        }
        .ccm-quiz-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          cursor: pointer;
          background: var(--bg-subtle);
          transition: background 0.2s;
        }
        .ccm-quiz-header:hover { background: var(--bg-subtle); }
        .ccm-quiz-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ccm-quiz-expand {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .ccm-quiz-info h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          color: var(--text-primary);
          margin: 0;
        }
        .ccm-quiz-unit {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .ccm-quiz-actions {
          display: flex;
          gap: 6px;
        }
        .ccm-quiz-detail {
          padding: 16px;
          border-top: 1px solid var(--border-default);
        }
        .ccm-questions-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .ccm-questions-header h4 {
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          color: var(--text-primary);
          margin: 0;
        }
        .ccm-question-form-card,
        .ccm-option-form-card {
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        .ccm-question-form-card h4,
        .ccm-option-form-card h5 {
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          color: var(--text-primary);
          margin: 0 0 12px 0;
        }
        .ccm-form-group {
          margin-bottom: 12px;
        }
        .ccm-form-group label {
          display: block;
          margin-bottom: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .ccm-form-group input,
        .ccm-form-group select,
        .ccm-form-group textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border-default);
          border-radius: 10px;
          font-size: 13px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .ccm-form-group input:focus,
        .ccm-form-group select:focus,
        .ccm-form-group textarea:focus {
          border-color: var(--accent);
        }
        .ccm-checkbox-group label {
          display: flex !important;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .ccm-checkbox-group input[type="checkbox"] {
          width: auto;
        }
        .ccm-input-error {
          border-color: var(--danger) !important;
        }
        .ccm-error-text {
          color: var(--danger);
          font-size: 11px;
          margin-top: 4px;
          display: block;
        }
        .ccm-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 12px;
        }
        .ccm-questions-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .ccm-question-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: 12px;
          padding: 12px;
        }
        .ccm-question-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }
        .ccm-question-header strong {
          font-size: 14px;
          color: var(--text-primary);
        }
        .ccm-question-header .ccm-badge {
          margin-left: 8px;
        }
        .ccm-question-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .ccm-options-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-default);
        }
        .ccm-options-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .ccm-options-header h5 {
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          color: var(--text-primary);
          margin: 0;
        }
        .ccm-options-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .ccm-option-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: var(--bg-subtle);
          border-radius: 10px;
          border: 1px solid var(--border-default);
        }
        .ccm-option-correct {
          background: var(--success-subtle);
          border-color: var(--success-subtle);
        }
        .ccm-option-text {
          flex: 1;
          font-size: 13px;
          color: var(--text-primary);
        }
        .ccm-correct-badge {
          background: var(--success);
          color: var(--bg-surface);
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 10px;
          font-weight: 600;
        }
        .ccm-option-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }
        .ccm-modal-overlay {
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
        .ccm-modal-content {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .ccm-modal-confirm {
          max-width: 400px;
        }
        .ccm-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .ccm-modal-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 18px;
          color: var(--text-primary);
          margin: 0;
        }
        .ccm-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          line-height: 1;
        }
        .ccm-modal-close:hover { color: var(--text-primary); }
        .ccm-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 20px;
        }
        .ccm-confirm-text {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
        }
        .ccm-material-type-selector {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .ccm-material-type-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 12px 16px;
          border: 2px solid var(--border-default);
          border-radius: 10px;
          background: var(--bg-surface);
          cursor: pointer;
          transition: all 0.2s;
          min-width: 80px;
        }
        .ccm-material-type-btn:hover { border-color: var(--accent-medium); background: var(--accent-subtle); }
        .ccm-material-type-selected { border-color: var(--accent); background: var(--accent-subtle); }
        .ccm-material-type-icon { font-size: 22px; }
        .ccm-material-type-label { font-size: 12px; font-weight: 500; color: var(--text-primary); }
        .ccm-question-type-selector { display: flex; gap: 10px; flex-wrap: wrap; }
        .ccm-question-type-btn { flex: 1; min-width: 140px; padding: 16px 12px; border: 2px solid var(--border-default); border-radius: 12px; background: var(--bg-surface); cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .ccm-question-type-btn:hover { border-color: var(--accent-medium); background: var(--accent-subtle); }
        .ccm-question-type-selected { border-color: var(--accent); background: var(--accent-subtle); box-shadow: var(--shadow-outset-sm); }
        .ccm-question-type-icon { font-size: 28px; }
        .ccm-question-type-label { font-family: 'Outfit', sans-serif; font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .ccm-question-type-desc { font-size: 11px; color: var(--text-secondary); text-align: center; }
        .ccm-question-options-panel { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px; margin-top: 12px; }
        .ccm-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .ccm-panel-header h5 { font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--text-primary); margin: 0; font-weight: 600; }
        .ccm-btn-add-option { background: var(--accent); color: var(--bg-surface); border: none; padding: 6px 14px; border-radius: 10px; font-size: 12px; cursor: pointer; font-weight: 500; }
        .ccm-btn-add-option:hover { background: var(--accent); }
        .ccm-hint-text { font-size: 13px; color: var(--text-secondary); margin: 8px 0; font-style: italic; }
        .ccm-option-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .ccm-option-letter { width: 28px; height: 28px; border-radius: 50%; background: var(--accent-subtle); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
        .ccm-option-input { flex: 1; padding: 8px 12px; border: 1px solid var(--border-default); border-radius: 10px; font-size: 13px; outline: none; }
        .ccm-option-input:focus { border-color: var(--accent); }
        .ccm-option-correct { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--success); font-weight: 500; white-space: nowrap; cursor: pointer; }
        .ccm-option-correct input { accent-color: var(--success); }
        .ccm-btn-remove-option { background: var(--danger-subtle); color: var(--danger); border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ccm-btn-remove-option:hover { background: var(--danger-subtle); }
        .ccm-vf-panel { background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 10px; padding: 16px; margin-top: 12px; }
        .ccm-vf-panel h5 { font-family: 'Outfit', sans-serif; font-size: 14px; color: var(--text-primary); margin: 0 0 12px 0; font-weight: 600; }
        .ccm-vf-options { display: flex; gap: 12px; }
        .ccm-vf-btn { flex: 1; padding: 16px; border: 2px solid var(--border-default); border-radius: 10px; background: var(--bg-surface); font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .ccm-vf-btn:hover { border-color: var(--accent-medium); }
        .ccm-vf-selected { border-color: var(--success); background: var(--success-subtle); color: var(--success); }
        .ccm-open-panel { background: var(--warning-subtle); border: 1px solid rgba(212, 168, 83, 0.2); border-radius: 10px; padding: 16px; margin-top: 12px; }
        .ccm-open-panel p { margin: 0; color: var(--warning); font-size: 13px; }
        @media (max-width: 768px) {
          .ccm-tabs {
            overflow-x: auto;
          }
          .ccm-tab {
            padding: 10px 16px;
            white-space: nowrap;
          }
          .ccm-section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default CourseContentManager;
