import { useState, useEffect, useContext, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const MyCourses = () => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    nombre_curso: '',
    descripcion: '',
    imagen_seleccionada: '',
    categoria: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [studentCounts, setStudentCounts] = useState({});

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('cursos')
        .select('id_curso, nombre_curso, descripcion, imagen_url, categoria, estado, fecha_creacion')
        .eq('id_docente', usuarioId)
        .order('fecha_creacion', { ascending: false });

      if (fetchError) throw fetchError;
      setCourses(data || []);

      const counts = {};
      if (data && data.length > 0) {
        const courseIds = data.map((c) => c.id_curso);
        if (courseIds.length > 0) {
          const { data: enrollments, error: enrollError } = await supabase
            .from('inscripciones')
            .select('id_curso')
            .in('id_curso', courseIds);

          if (!enrollError && enrollments) {
            enrollments.forEach((e) => {
              counts[e.id_curso] = (counts[e.id_curso] || 0) + 1;
            });
          }
        }
      }
      setStudentCounts(counts);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [usuarioId]);

  useEffect(() => {
    if (usuarioId) fetchCourses();
  }, [usuarioId, fetchCourses]);

  const validateForm = () => {
    const errors = {};
    if (!formData.nombre_curso.trim()) errors.nombre_curso = 'El nombre del curso es obligatorio';
    if (!formData.descripcion.trim()) errors.descripcion = 'La descripción es obligatoria';
    if (!formData.categoria.trim()) errors.categoria = 'La categoría es obligatoria';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const CATEGORIES = ['Ciencias', 'Matemáticas', 'Programación', 'Idiomas', 'Arte', 'Historia', 'Negocios', 'Salud'];

  const IMAGE_OPTIONS = [
    { id: 'ciencias', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=250&fit=crop', label: 'Ciencias' },
    { id: 'matematicas', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=250&fit=crop', label: 'Matemáticas' },
    { id: 'programacion', url: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=250&fit=crop', label: 'Programación' },
    { id: 'idiomas', url: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=250&fit=crop', label: 'Idiomas' },
    { id: 'arte', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400&h=250&fit=crop', label: 'Arte' },
    { id: 'historia', url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?w=400&h=250&fit=crop', label: 'Historia' },
    { id: 'negocios', url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=250&fit=crop', label: 'Negocios' },
    { id: 'salud', url: 'https://images.unsplash.com/photo-1505576399279-0d754c0ce141?w=400&h=250&fit=crop', label: 'Salud' },
    { id: 'general', url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=250&fit=crop', label: 'General' },
  ];

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData({ nombre_curso: '', descripcion: '', imagen_seleccionada: 'general', categoria: '' });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (c) => {
    setEditingCourse(c);
    const imgOption = IMAGE_OPTIONS.find(opt => opt.url === c.imagen_url);
    setFormData({
      nombre_curso: c.nombre_curso,
      descripcion: c.descripcion || '',
      imagen_seleccionada: imgOption ? imgOption.id : 'general',
      categoria: c.categoria || '',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCourse(null);
    setFormData({ nombre_curso: '', descripcion: '', imagen_seleccionada: 'general', categoria: '' });
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
      const imgOption = IMAGE_OPTIONS.find(opt => opt.id === formData.imagen_seleccionada);
      const courseData = {
        nombre_curso: formData.nombre_curso.trim(),
        descripcion: formData.descripcion.trim(),
        imagen_url: imgOption ? imgOption.url : IMAGE_OPTIONS.find(o => o.id === 'general').url,
        categoria: formData.categoria.trim(),
        id_docente: usuarioId,
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

  if (loading && courses.length === 0) {
    return <div className="my-courses-loading">Cargando cursos...</div>;
  }

  return (
    <div className="my-courses">
      <div className="my-courses-header">
        <div>
          <h1>Mis Cursos</h1>
          <p>Gestiona tus cursos y su contenido</p>
        </div>
        <button className="btn-create-course" onClick={openCreateModal}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nuevo Curso
        </button>
      </div>

      {error && <div className="my-courses-error">{error}</div>}
      {success && <div className="my-courses-success">{success}</div>}

      {courses.length === 0 ? (
        <div className="my-courses-empty-premium">
          <div className="empty-illustration">
            <div className="illustration-blob"></div>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>¿Listo para compartir tu conocimiento?</h2>
          <p>Aún no has creado ningún curso. Comienza ahora y ayuda a cientos de estudiantes a alcanzar sus metas académicas.</p>
          <button className="btn-create-primary-premium" onClick={openCreateModal}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Crear mi primer curso profesional
          </button>
        </div>
      ) : (
        <div className="my-courses-grid">
          {courses.map((c) => (
            <div key={c.id_curso} className={`my-course-card ${c.estado === 'inactivo' ? 'my-course-inactive' : ''}`}>
              <div className="my-course-image">
                {c.imagen_url ? (
                  <img src={c.imagen_url} alt={c.nombre_curso} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <div className="my-course-image-placeholder" style={{ display: c.imagen_url ? 'none' : 'flex' }}>
                  📚
                </div>
              </div>
              <div className="my-course-body">
                <div className="my-course-badges">
                  <span className={`my-course-badge ${c.estado === 'activo' ? 'my-course-badge-active' : 'my-course-badge-inactive'}`}>
                    {c.estado}
                  </span>
                  <span className="my-course-category">{c.categoria}</span>
                </div>
                <h3>{c.nombre_curso}</h3>
                <p className="my-course-desc">{c.descripcion}</p>
                <div className="my-course-meta">
                  <span className="my-course-students">
                    👥 {studentCounts[c.id_curso] || 0} estudiantes
                  </span>
                  <span className="my-course-date">
                    {new Date(c.fecha_creacion).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <div className="my-course-actions">
                  <Link to={`/docente/course/${c.id_curso}/content`} className="my-course-btn-manage">
                    Gestionar Contenido
                  </Link>
                  <button className="my-course-btn-toggle" onClick={() => toggleStatus(c)}>
                    {c.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                  <button className="my-course-btn-edit" onClick={() => openEditModal(c)}>
                    Editar
                  </button>
                  <button className="my-course-btn-delete" onClick={() => confirmDelete(c)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="my-courses-modal-overlay" onClick={closeModal}>
          <div className="my-courses-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="my-courses-modal-header">
              <h2>{editingCourse ? 'Editar Curso' : 'Crear Curso'}</h2>
              <button className="my-courses-modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="my-courses-modal-form">
              <div className="my-courses-form-group">
                <label>Nombre del Curso</label>
                <input
                  type="text"
                  name="nombre_curso"
                  value={formData.nombre_curso}
                  onChange={handleInputChange}
                  className={formErrors.nombre_curso ? 'my-courses-input-error' : ''}
                  placeholder="Ej: Matemáticas Avanzadas"
                />
                {formErrors.nombre_curso && <span className="my-courses-error-text">{formErrors.nombre_curso}</span>}
              </div>

              <div className="my-courses-form-group">
                <label>Descripción</label>
                <textarea
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  className={formErrors.descripcion ? 'my-courses-input-error' : ''}
                  placeholder="Descripción del curso"
                  rows="3"
                />
                {formErrors.descripcion && <span className="my-courses-error-text">{formErrors.descripcion}</span>}
              </div>

              <div className="my-courses-form-group">
                <label>Imagen del Curso</label>
                <div className="my-courses-image-selector">
                  {IMAGE_OPTIONS.map((img) => (
                    <div
                      key={img.id}
                      className={`my-courses-image-option ${formData.imagen_seleccionada === img.id ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, imagen_seleccionada: img.id })}
                    >
                      <img src={img.url} alt={img.label} />
                      <span className="my-courses-image-label">{img.label}</span>
                      {formData.imagen_seleccionada === img.id && <div className="my-courses-image-check">&#10003;</div>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="my-courses-form-group">
                <label>Categoría</label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleInputChange}
                  className={formErrors.categoria ? 'my-courses-input-error' : ''}
                >
                  <option value="">Seleccionar categoría</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {formErrors.categoria && <span className="my-courses-error-text">{formErrors.categoria}</span>}
              </div>

              <div className="my-courses-modal-actions">
                <button type="button" className="my-courses-btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="my-courses-btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingCourse ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="my-courses-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="my-courses-modal-content my-courses-modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="my-courses-modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="my-courses-modal-close" onClick={() => setDeleteConfirm(null)}>
                &times;
              </button>
            </div>
            <p className="my-courses-confirm-text">
              ¿Está seguro de eliminar el curso <strong>{deleteConfirm.nombre_curso}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="my-courses-modal-actions">
              <button className="my-courses-btn-secondary" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </button>
              <button className="my-course-btn-delete" onClick={handleDelete}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .my-courses {
          padding: 0;
          max-width: 100%;
          margin: 0 auto;
        }
        .my-courses-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 18px;
          color: var(--text-secondary);
        }
        .my-courses-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .my-courses-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 28px;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .my-courses-header p {
          color: var(--text-secondary);
          margin: 0;
        }
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
        .my-courses-error {
          background: var(--danger-subtle);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .my-courses-success {
          background: var(--success-subtle);
          color: var(--success);
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
        }
        .my-courses-empty-premium {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 80px 40px;
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border-radius: 30px;
          border: 1px dashed rgba(255, 255, 255, 0.15);
          margin-top: 20px;
          animation: fadeInContainer 0.8s ease-out;
        }

        .empty-illustration {
          position: relative;
          width: 120px;
          height: 120px;
          margin-bottom: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .illustration-blob {
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, #2a9d8f44 0%, transparent 70%);
          filter: blur(20px);
          animation: pulseBlob 4s infinite alternate;
        }

        .empty-illustration svg {
          width: 80px;
          height: 80px;
          color: #2a9d8f;
          z-index: 1;
        }

        .my-courses-empty-premium h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 1.8rem;
          color: var(--text-primary);
          margin-bottom: 12px;
          font-weight: 700;
        }

        .my-courses-empty-premium p {
          max-width: 450px;
          color: var(--text-secondary);
          font-size: 1.1rem;
          line-height: 1.6;
          margin-bottom: 35px;
        }

        .btn-create-primary-premium {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #2a9d8f;
          color: white;
          border: none;
          padding: 16px 32px;
          border-radius: 16px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 10px 20px rgba(42, 157, 143, 0.2);
        }

        .btn-create-primary-premium:hover {
          transform: translateY(-5px) scale(1.02);
          background: #268a7d;
          box-shadow: 0 15px 30px rgba(42, 157, 143, 0.3);
        }

        @keyframes pulseBlob {
          from { transform: scale(1); opacity: 0.5; }
          to { transform: scale(1.3); opacity: 0.8; }
        }

        @keyframes fadeInContainer {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .my-courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
        }
        .my-course-card {
          background: var(--bg-surface);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-default);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .my-course-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-outset);
        }
        .my-course-inactive {
          opacity: 0.7;
        }
        .my-course-image {
          width: 100%;
          height: 160px;
          background: var(--bg-subtle);
          overflow: hidden;
        }
        .my-course-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .my-course-image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          background: linear-gradient(135deg, var(--accent-subtle) 0%, var(--success-subtle) 100%);
        }
        .my-course-body {
          padding: 16px;
        }
        .my-course-badges {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }
        .my-course-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .my-course-badge-active { background: var(--success-subtle); color: var(--success); }
        .my-course-badge-inactive { background: var(--danger-subtle); color: var(--danger); }
        .my-course-category {
          font-size: 12px;
          color: var(--text-secondary);
          padding: 4px 0;
        }
        .my-course-body h3 {
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          color: var(--text-primary);
          margin: 0 0 8px 0;
        }
        .my-course-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 12px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .my-course-meta {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-tertiary);
          margin-bottom: 12px;
        }
        .my-course-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .my-course-btn-manage {
          background: var(--accent);
          color: var(--bg-surface);
          border: none;
          padding: 6px 12px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          text-decoration: none;
          text-align: center;
          flex: 1;
          min-width: 120px;
          transition: background 0.2s;
        }
        .my-course-btn-manage:hover { background: var(--accent); }
        .my-course-btn-toggle {
          background: var(--warning-subtle);
          color: var(--warning);
          border: none;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .my-course-btn-toggle:hover { background: var(--warning-subtle); }
        .my-course-btn-edit {
          background: var(--accent-subtle);
          color: var(--accent);
          border: none;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .my-course-btn-edit:hover { background: var(--accent-medium); }
        .my-course-btn-delete {
          background: var(--danger-subtle);
          color: var(--danger);
          border: none;
          padding: 6px 10px;
          border-radius: 10px;
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.2s;
        }
        .my-course-btn-delete:hover { background: var(--danger-subtle); }
        .my-courses-modal-overlay {
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
        .my-courses-modal-content {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 520px;
          max-height: 90vh;
          overflow-y: auto;
        }
        .my-courses-modal-confirm {
          max-width: 400px;
        }
        .my-courses-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .my-courses-modal-header h2 {
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          color: var(--text-primary);
          margin: 0;
        }
        .my-courses-modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: var(--text-secondary);
          padding: 0;
          line-height: 1;
        }
        .my-courses-modal-close:hover { color: var(--text-primary); }
        .my-courses-modal-form .my-courses-form-group {
          margin-bottom: 16px;
        }
        .my-courses-modal-form label {
          display: block;
          margin-bottom: 6px;
          font-size: 14px;
          font-weight: 500;
          color: var(--text-primary);
        }
        .my-courses-modal-form input,
        .my-courses-modal-form textarea {
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
        .my-courses-modal-form input:focus,
        .my-courses-modal-form textarea:focus {
          border-color: var(--accent);
        }
        .my-courses-input-error {
          border-color: var(--danger) !important;
        }
        .my-courses-error-text {
          color: var(--danger);
          font-size: 12px;
          margin-top: 4px;
          display: block;
        }
        .my-courses-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
        }
        .my-courses-btn-primary {
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
        .my-courses-btn-primary:hover { background: var(--accent); }
        .my-courses-btn-primary:disabled { background: var(--accent-medium); cursor: not-allowed; }
        .my-courses-btn-secondary {
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
        .my-courses-btn-secondary:hover { background: var(--border-default); }
        .my-courses-btn-delete {
          background: var(--danger-subtle);
          color: var(--danger);
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 500;
        }
        .my-courses-btn-delete:hover { background: var(--danger-subtle); }
        .my-courses-confirm-text {
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.5;
        }
        .my-courses-image-selector {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 8px;
        }
        .my-courses-image-option {
          position: relative;
          border: 3px solid transparent;
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: border-color 0.2s, transform 0.2s;
        }
        .my-courses-image-option:hover {
          transform: scale(1.03);
        }
        .my-courses-image-option.selected {
          border-color: var(--accent);
        }
        .my-courses-image-option img {
          width: 100%;
          height: 70px;
          object-fit: cover;
          display: block;
        }
        .my-courses-image-label {
          display: block;
          text-align: center;
          font-size: 11px;
          padding: 4px 2px;
          background: var(--bg-subtle);
          font-weight: 500;
        }
        .my-courses-image-check {
          position: absolute;
          top: 4px;
          right: 4px;
          background: var(--accent);
          color: white;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
        }
        @media (max-width: 768px) {
          .my-courses-grid {
            grid-template-columns: 1fr;
          }
          .my-courses-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }
          .my-courses-image-selector {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default MyCourses;
