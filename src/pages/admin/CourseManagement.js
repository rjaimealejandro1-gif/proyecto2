import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const CourseManagement = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    nombre_curso: '',
    descripcion: '',
    imagen_url: '',
    categoria: '',
    estado: 'activo',
    id_docente: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchTeachers();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cursos')
        .select('id_curso, nombre_curso, descripcion, imagen_url, categoria, estado, id_docente, fecha_creacion, usuarios!cursos_id_docente_fkey(nombre)')
        .order('fecha_creacion', { ascending: false });

      if (fetchError) throw fetchError;
      setCourses(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre')
        .eq('id_rol', 2)
        .order('nombre', { ascending: true });

      if (fetchError) throw fetchError;
      setTeachers(data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombre_curso.trim()) errors.nombre_curso = 'El nombre del curso es obligatorio';
    if (!formData.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
    if (!formData.categoria.trim()) errors.categoria = 'La categoría es obligatoria';
    if (!formData.id_docente) errors.id_docente = 'Seleccione un docente';
    if (formData.imagen_url && !/^https?:\/\/.+/i.test(formData.imagen_url)) {
      errors.imagen_url = 'URL inválida';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({
      nombre_curso: '',
      descripcion: '',
      imagen_url: '',
      categoria: '',
      estado: 'activo',
      id_docente: '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingCourse(c);
    setFormData({
      nombre_curso: c.nombre_curso,
      descripcion: c.descripcion || '',
      imagen_url: c.imagen_url || '',
      categoria: c.categoria || '',
      estado: c.estado,
      id_docente: c.id_docente,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setFormData({
      nombre_curso: '',
      descripcion: '',
      imagen_url: '',
      categoria: '',
      estado: 'activo',
      id_docente: '',
    });
    setFormErrors({});
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const courseData = {
        nombre_curso: formData.nombre_curso.trim(),
        descripcion: formData.descripcion.trim(),
        imagen_url: formData.imagen_url.trim() || null,
        categoria: formData.categoria.trim(),
        estado: formData.estado,
        id_docente: formData.id_docente,
      };

      if (editingCourse) {
        const { error: updateError } = await supabase
          .from('cursos')
          .update(courseData)
          .eq('id_curso', editingCourse.id_curso);

        if (updateError) throw updateError;
        setSuccess('Curso actualizado correctamente');
      } else {
        const { error: insertError } = await supabase
          .from('cursos')
          .insert([courseData]);

        if (insertError) throw insertError;
        setSuccess('Curso creado correctamente');
      }

      closeModal();
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Error al guardar el curso');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (course) => {
    setError(null);
    setSuccess(null);
    const newStatus = course.estado === 'activo' ? 'inactivo' : 'activo';

    try {
      const { error: updateError } = await supabase
        .from('cursos')
        .update({ estado: newStatus })
        .eq('id_curso', course.id_curso);

      if (updateError) throw updateError;
      setSuccess(`Curso ${newStatus === 'activo' ? 'activado' : 'desactivado'} correctamente`);
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Error al cambiar el estado del curso');
    }
  };

  const confirmDelete = (c) => {
    setDeleteConfirm(c);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setError(null);
    setSuccess(null);

    try {
      const { error: deleteError } = await supabase
        .from('cursos')
        .delete()
        .eq('id_curso', deleteConfirm.id_curso);

      if (deleteError) throw deleteError;
      setSuccess('Curso eliminado correctamente');
      setDeleteConfirm(null);
      fetchCourses();
    } catch (err) {
      setError(err.message || 'Error al eliminar el curso');
    }
  };

  const getTeacherName = (course) => {
    if (course.usuarios && course.usuarios.nombre) return course.usuarios.nombre;
    const teacher = teachers.find((t) => t.id_usuario === course.id_docente);
    return teacher ? teacher.nombre : 'Sin asignar';
  };

  const filteredCourses = courses.filter((c) => {
    const matchesSearch = c.nombre_curso.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || c.estado === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading && courses.length === 0) {
    return <div className="admin-page-loading">Cargando cursos...</div>;
  }

  return (
    <div className="course-management">
      <div className="page-header">
        <h1>Gestión de Cursos</h1>
        <button className="btn-create-course" onClick={openCreateModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Curso
        </button>
      </div>

      {error && <div className="admin-error-message">{error}</div>}
      {success && <div className="admin-success-message">{success}</div>}

      <div className="filters-bar">
        <div className="search-premium-wrapper">
          <div className="search-premium-white"></div>
          <div className="search-premium-border"></div>
          <div className="search-premium-darkBorderBg"></div>
          <div className="search-premium-glow"></div>
          <span className="search-premium-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            type="text"
            className="search-premium-input"
            placeholder="Buscar por nombre del curso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="inactivo">Inactivo</option>
        </select>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Docente</th>
              <th>Fecha Creación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCourses.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data-cell">
                  No se encontraron cursos
                </td>
              </tr>
            ) : (
              filteredCourses.map((c) => (
                <tr key={c.id_curso}>
                  <td className="course-name-cell">{c.nombre_curso}</td>
                  <td>{c.categoria || '-'}</td>
                  <td>
                    <span className={`badge ${c.estado === 'activo' ? 'badge-active' : 'badge-inactive'}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td>{getTeacherName(c)}</td>
                  <td>{new Date(c.fecha_creacion).toLocaleDateString('es-ES')}</td>
                  <td className="actions-cell">
                    <button
                      className="btn-toggle"
                      onClick={() => toggleStatus(c)}
                    >
                      {c.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="btn-edit" onClick={() => openEditModal(c)}>
                      Editar
                    </button>
                    <button className="btn-delete" onClick={() => confirmDelete(c)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="cm-modal-overlay" onClick={closeModal}>
          <div className="cm-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>{editingCourse ? 'Editar Curso' : 'Crear Curso'}</h2>
              <button className="cm-modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="cm-modal-form">
              <div className="cm-form-group">
                <label>Nombre del Curso</label>
                <input
                  type="text"
                  name="nombre_curso"
                  value={formData.nombre_curso}
                  onChange={handleInputChange}
                  className={formErrors.nombre_curso ? 'cm-input-error' : ''}
                  placeholder="Ej: Matemáticas Avanzadas"
                />
                {formErrors.nombre_curso && <span className="cm-error-text">{formErrors.nombre_curso}</span>}
              </div>

              <div className="cm-form-group">
                <label>Descripción</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className={formErrors.descripcion ? 'cm-input-error' : ''}
                  placeholder="Descripción del curso"
                  rows="3"
                />
                {formErrors.descripcion && <span className="cm-error-text">{formErrors.descripcion}</span>}
              </div>

              <div className="cm-form-group">
                <label>URL de Imagen</label>
                <input
                  type="url"
                  name="imagen_url"
                  value={formData.imagen_url}
                  onChange={handleInputChange}
                  className={formErrors.imagen_url ? 'cm-input-error' : ''}
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {formErrors.imagen_url && <span className="cm-error-text">{formErrors.imagen_url}</span>}
              </div>

              <div className="cm-form-group">
                <label>Categoría</label>
                <input
                  type="text"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  className={formErrors.categoria ? 'cm-input-error' : ''}
                  placeholder="Ej: Ciencias, Matemáticas"
                />
                {formErrors.categoria && <span className="cm-error-text">{formErrors.categoria}</span>}
              </div>

              <div className="cm-form-group">
                <label>Estado</label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleInputChange}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>

              <div className="cm-form-group">
                <label>Docente</label>
                <select
                  name="id_docente"
                  value={formData.id_docente}
                  onChange={handleInputChange}
                  className={formErrors.id_docente ? 'cm-input-error' : ''}
                >
                  <option value="">Seleccione un docente</option>
                  {teachers.map((t) => (
                    <option key={t.id_usuario} value={t.id_usuario}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
                {formErrors.id_docente && <span className="cm-error-text">{formErrors.id_docente}</span>}
              </div>

              <div className="cm-modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingCourse ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="cm-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="cm-modal-content cm-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="cm-modal-close" onClick={() => setDeleteConfirm(null)}>
                &times;
              </button>
            </div>
            <p className="cm-confirm-text">
              ¿Está seguro de eliminar el curso <strong>{deleteConfirm.nombre_curso}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="cm-modal-actions">
              <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="btn-delete" onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .course-management {
          padding: 0;
          max-width: 100%;
          margin: 0 auto;
        }
        .admin-page-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 18px;
          color: var(--text-secondary);
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .page-header h1 {
          font-size: 28px;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          margin: 0;
        }
        .admin-error-message {
          background: var(--danger-subtle);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .admin-success-message {
          background: var(--success-subtle);
          color: var(--success);
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 16px;
        }
        .filters-bar {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
        }
        .search-input {
          flex: 1;
          padding: 10px 16px;
          border: 1px solid var(--border-default);
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        .search-input:focus {
          border-color: var(--accent);
        }
        .filter-select {
          padding: 10px 16px;
          border: 1px solid var(--border-default);
          border-radius: 12px;
          font-size: 14px;
          background: var(--bg-surface);
          outline: none;
          cursor: pointer;
        }
        .table-container {
          background: var(--bg-surface);
          border-radius: 20px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-default);
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-table th,
        .admin-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid var(--border-default);
          font-size: 14px;
        }
        .admin-table th {
          background: var(--bg-subtle);
          color: var(--text-primary);
          font-weight: 600;
        }
        .admin-table td {
          color: var(--text-secondary);
        }
        .no-data-cell {
          text-align: center;
          color: var(--text-tertiary);
          padding: 32px !important;
        }
        .course-name-cell {
          font-weight: 500;
          color: var(--text-primary);
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .badge-active { background: var(--success-subtle); color: var(--success); }
        .badge-inactive { background: var(--danger-subtle); color: var(--danger); }
        .actions-cell {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn-primary {
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .btn-primary:hover { background: var(--accent); filter: brightness(0.9); }
        .btn-primary:disabled { background: var(--accent-medium); cursor: not-allowed; }
        .btn-create-course {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--gradient-accent);
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 14px;
          font-size: 0.875rem;
          cursor: pointer;
          font-weight: 600;
          font-family: 'Outfit', sans-serif;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 16px rgba(91, 141, 239, 0.25);
        }
        .btn-create-course:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 24px rgba(91, 141, 239, 0.35);
        }
        .btn-create-course:active {
          transform: translateY(0);
        }
        .btn-secondary {
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
        .btn-secondary:hover { background: var(--border-default); }
        .btn-edit {
          background: var(--accent-subtle);
          color: var(--accent);
          border: none;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-edit:hover { background: var(--accent-medium); }
        .btn-delete {
          background: var(--danger-subtle);
          color: var(--danger);
          border: none;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-delete:hover { background: var(--danger-subtle); }
        .btn-toggle {
          background: var(--warning-subtle);
          color: var(--warning);
          border: none;
          padding: 6px 14px;
          border-radius: 10px;
          font-size: 13px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-toggle:hover { background: var(--warning-subtle); }
        .cm-modal-overlay {
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
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .cm-modal-content {
          background: var(--bg-elevated);
          border-radius: 22px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-float-lg);
          border: 1px solid var(--border-light);
          animation: modalSlideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cm-modal-confirm {
          max-width: 420px;
        }
        .cm-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 22px 24px;
          border-bottom: 1px solid var(--border-light);
        }
        .cm-modal-header h2 {
          font-size: 1.05rem;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          margin: 0;
          font-weight: 600;
        }
        .cm-modal-close {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-tertiary);
          border-radius: 10px;
          transition: all 0.2s;
        }
        .cm-modal-close:hover { background: var(--bg-subtle); color: var(--text-primary); }
        .cm-modal-form {
          padding: 24px;
        }
        .cm-modal-form .cm-form-group {
          margin-bottom: 18px;
        }
        .cm-modal-form label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.775rem;
          font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: 0.3px;
        }
        .cm-modal-form input,
        .cm-modal-form select,
        .cm-modal-form textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--border-default);
          border-radius: 12px;
          font-size: 0.875rem;
          outline: none;
          box-sizing: border-box;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
          background: var(--bg-surface);
          color: var(--text-primary);
        }
        .cm-modal-form input:focus,
        .cm-modal-form select:focus,
        .cm-modal-form textarea:focus {
          border-color: var(--accent);
          background: var(--bg-elevated);
          box-shadow: 0 0 0 4px var(--accent-subtle);
        }
        .cm-input-error {
          border-color: var(--danger) !important;
        }
        .cm-error-text {
          display: block;
          font-size: 0.725rem;
          color: var(--danger);
          margin-top: 6px;
        }
        .cm-confirm-text {
          padding: 0 24px;
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .cm-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 18px 24px;
          border-top: 1px solid var(--border-light);
          background: var(--bg-subtle);
          border-radius: 0 0 22px 22px;
        }
        .modal-content {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .modal-confirm {
          max-width: 400px;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .modal-header h2 {
          font-size: 20px;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          margin: 0;
        }
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          line-height: 1;
        }
        .modal-close:hover { color: var(--text-primary); }
        .modal-form .form-group {
          margin-bottom: 16px;
        }
        .modal-form label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .modal-form input,
        .modal-form select,
        .modal-form textarea {
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
        .modal-form input:focus,
        .modal-form select:focus,
        .modal-form textarea:focus {
          border-color: var(--accent);
        }
        .input-error {
          border-color: var(--danger) !important;
        }
        .error-text {
          color: var(--danger);
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .confirm-text {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default CourseManagement;
