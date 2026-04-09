import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../supabaseClient';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', password: '', id_rol: 3 });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select('id_usuario, nombre, email, id_rol, fecha_registro, auth_id')
        .order('fecha_registro', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (id_rol) => {
    const roleMap = { 1: 'Administrador', 2: 'Docente', 3: 'Estudiante' };
    return roleMap[id_rol] || 'Desconocido';
  };

  const getRoleBadgeClass = (id_rol) => {
    const classMap = { 1: 'badge-admin', 2: 'badge-docente', 3: 'badge-estudiante' };
    return classMap[id_rol] || '';
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    if (!formData.email.trim()) errors.email = 'El email es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Email inválido';
    if (!editingUser && !formData.password) errors.password = 'La contraseña es obligatoria';
    else if (!editingUser && formData.password.length < 6) errors.password = 'Mínimo 6 caracteres';
    if (!formData.id_rol) errors.id_rol = 'Seleccione un rol';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ nombre: '', email: '', password: '', id_rol: 3 });
    setFormErrors({});
  };

  const fetchUserHistory = async (user) => {
    setViewingHistory(user);
    setHistoryLoading(true);
    setUserHistory([]);
    try {
      const { data, error } = await supabase
        .from('historial_actividad')
        .select('*')
        .eq('id_usuario', user.id_usuario)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setUserHistory(data || []);
    } catch (err) {
      // Ignorar errores silenciados
    } finally {
      setHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setViewingHistory(null);
    setUserHistory([]);
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
      if (editingUser) {
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ nombre: formData.nombre.trim(), id_rol: parseInt(formData.id_rol) })
          .eq('id_usuario', editingUser.id_usuario);

        if (updateError) throw updateError;
        setSuccess('Usuario actualizado correctamente');
      } else {
        setError('La creación de usuarios se realiza desde registro para mantener sesiones seguras.');
        return;
      }

      closeModal();
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Error al guardar el usuario');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (u) => {
    setDeleteConfirm(u);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const userId = deleteConfirm.id_usuario;
      const userName = deleteConfirm.nombre;
      const { data, error: deleteError } = await supabase.rpc('admin_delete_user', {
        p_target_user_id: userId,
      });
      if (deleteError) {
        throw new Error(deleteError.message);
      }
      if (!data?.ok) {
        throw new Error('No se pudo completar la eliminación');
      }

      await fetchUsers();
      setSuccess(`✓ Usuario "${userName}" eliminado correctamente`);
      setDeleteConfirm(null);
    } catch (err) {
      setError('Error: ' + (err.message || 'No se pudo eliminar'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || u.id_rol === parseInt(filterRole);
    return matchesSearch && matchesRole;
  });

  if (loading && users.length === 0) {
    return <div className="admin-page-loading">Cargando usuarios...</div>;
  }

  return (
    <div className="user-management">
      <div className="page-header">
        <h1>Gestión de Usuarios</h1>
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
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="all">Todos los roles</option>
          <option value="1">Administrador</option>
          <option value="2">Docente</option>
          <option value="3">Estudiante</option>
        </select>
      </div>

      <div className="table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Nombre</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="6" className="no-data-cell">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id_usuario}>
                  <td>
                    <img 
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${u.email}`} 
                      className="table-avatar" 
                      alt="Avatar"
                    />
                  </td>
                  <td>{u.nombre}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge ${getRoleBadgeClass(u.id_rol)}`}>
                      {getRoleLabel(u.id_rol)}
                    </span>
                  </td>
                  <td>{new Date(u.fecha_registro).toLocaleDateString('es-ES')}</td>
                  <td>
                    <div className="actions-wrapper">
                      <button className="btn-edit" onClick={() => fetchUserHistory(u)}>
                        Historial
                      </button>
                      <button className="btn-delete" onClick={() => confirmDelete(u)} disabled={u.id_rol === 1}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && createPortal(
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</h2>
              <button className="modal-close" onClick={closeModal}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={formErrors.nombre ? 'input-error' : ''}
                  placeholder="Nombre completo"
                />
                {formErrors.nombre && <span className="error-text">{formErrors.nombre}</span>}
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={formErrors.email ? 'input-error' : ''}
                  placeholder="correo@ejemplo.com"
                  disabled={!!editingUser}
                />
                {formErrors.email && <span className="error-text">{formErrors.email}</span>}
              </div>

              {!editingUser && (
                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={formErrors.password ? 'input-error' : ''}
                    placeholder="Mínimo 6 caracteres"
                  />
                  {formErrors.password && <span className="error-text">{formErrors.password}</span>}
                </div>
              )}

              <div className="form-group">
                <label>Rol</label>
                <select
                  name="id_rol"
                  value={formData.id_rol}
                  onChange={handleInputChange}
                  className={formErrors.id_rol ? 'input-error' : ''}
                >
                  <option value={3}>Estudiante</option>
                  <option value={2}>Docente</option>
                  <option value={1}>Administrador</option>
                </select>
                {formErrors.id_rol && <span className="error-text">{formErrors.id_rol}</span>}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {deleteConfirm && createPortal(
        <div 
          className="admin-modal-overlay" 
          onClick={() => setDeleteConfirm(null)}
        >
          <div 
            className="modal-content modal-confirm" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
                &times;
              </button>
            </div>
            
            <div className="user-profile-card">
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${deleteConfirm?.email}`} alt="Avatar" className="profile-card-avatar" />
               <div className="profile-card-info">
                  <span className="profile-card-name">{deleteConfirm?.nombre}</span>
                  <span className="profile-card-email">{deleteConfirm?.email}</span>
                  <span className={`badge ${getRoleBadgeClass(deleteConfirm?.id_rol)}`} style={{marginTop: '6px', alignSelf: 'flex-start'}}>
                    {getRoleLabel(deleteConfirm?.id_rol)}
                  </span>
               </div>
            </div>

            <p className="confirm-text">
              ¿Está seguro de eliminar a este usuario de forma permanente? 
              <br/><br/>
              <span className="warning-text">⚠ Esta acción eliminará de forma irreversible su cuenta autenticada y destruirá en cascada TODOS sus cursos, foros, entregas, calificaciones y registros.</span>
            </p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  setDeleteConfirm(null);
                }}>
                  Cancelar
                </button>
                
                <button 
                  type="button"
                  className="modal-btn-danger"
                  onClick={handleDelete}
                  disabled={submitting}
                >
                  {submitting ? 'Eliminando...' : 'Eliminar usuario'}
                </button>
              </div>
          </div>
        </div>,
        document.body
      )}

      {viewingHistory && createPortal(
        <div className="admin-modal-overlay" onClick={closeHistoryModal}>
          <div className="modal-content history-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Historial de Actividad: {viewingHistory.nombre}</h2>
              <button className="modal-close" onClick={closeHistoryModal}>&times;</button>
            </div>
            {historyLoading ? (
              <div className="admin-page-loading list-loader">Cargando historial...</div>
            ) : userHistory.length === 0 ? (
              <div className="no-data-cell empty-history">El usuario no tiene una actividad registrada.</div>
            ) : (
              <div className="history-list">
                {userHistory.map((item) => (
                  <div key={item.id_actividad} className="history-item">
                    <div className="history-desc">{item.descripcion}</div>
                    <div className="history-meta">
                      <span className="history-badge">
                        {item.tipo.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {new Date(item.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="modal-btn-secondary" onClick={closeHistoryModal}>Cerrar Historial</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style>{`
        .user-management {
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
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .badge-admin { background: var(--accent-subtle); color: var(--accent); }
        .badge-docente { background: var(--success-subtle); color: var(--success); }
        .badge-estudiante { background: var(--warning-subtle); color: var(--warning); }
        .actions-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
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
        .admin-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(5px);
        }
        .modal-content {
          background: #ffffff;
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 480px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0px 10px 40px rgba(0,0,0,0.5);
          color: #1a2517;
          border: 1px solid var(--border-default, #e0e0e0);
        }
        .history-modal-content {
          max-width: 600px;
        }
        [data-theme="dark"] .modal-content {
          background: #222222;
          color: #c2d8c4;
          border: 1px solid #333;
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
        .modal-form select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--border-default);
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .modal-form input:focus,
        .modal-form select:focus {
          border-color: var(--accent);
        }
        .modal-form input:disabled {
          background: var(--bg-subtle);
          cursor: not-allowed;
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
          color: var(--text-primary, #333);
          font-size: 15px;
          line-height: 1.5;
          margin-top: 15px;
        }
        .warning-text {
          color: #d32f2f;
          font-weight: 700;
          font-size: 14px;
        }
        .user-profile-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: var(--bg-subtle, #eaeaea);
          padding: 16px;
          border-radius: 12px;
          margin: 15px 0;
          border: 1px solid var(--border-default, #ccc);
        }
        [data-theme="dark"] .user-profile-card {
          background: var(--bg-subtle, #2a2a2a);
          border-color: #444;
        }
        .profile-card-avatar {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .profile-card-info {
          display: flex;
          flex-direction: column;
        }
        .profile-card-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary, #111);
        }
        [data-theme="dark"] .profile-card-name {
          color: #c2d8c4;
        }
        .profile-card-email {
          font-size: 14px;
          color: #556c52;
          margin-top: 2px;
        }
        [data-theme="dark"] .profile-card-email {
          color: #92a894;
        }

        /* Historial Modal */
        .list-loader {
          min-height: 200px;
        }
        .empty-history {
          margin: 40px 0;
          color: inherit;
          opacity: 0.7;
        }
        .history-list {
          max-height: 400px;
          overflow-y: auto;
          padding-right: 10px;
        }
        .history-item {
          padding: 16px;
          border-bottom: 1px solid #e0e6df;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        [data-theme="dark"] .history-item {
          border-bottom: 1px solid #383838;
        }
        .history-item:last-child {
          border-bottom: none;
        }
        .history-desc {
          font-size: 14px;
          font-weight: 600;
          color: inherit;
        }
        .history-meta {
          font-size: 12px;
          color: #556c52;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        [data-theme="dark"] .history-meta {
          color: #8da48f;
        }
        .history-badge {
          padding: 4px 8px;
          background: #e6efe8;
          color: #244126;
          border-radius: 6px;
          font-weight: 500;
        }
        [data-theme="dark"] .history-badge {
          background: #2a3c2c;
          color: #a4ceaa;
        }

        /* Modal Buttons */
        .modal-btn-secondary {
          background: #eef2ed;
          color: #1a2517;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 600;
          transition: background 0.2s;
        }
        .modal-btn-secondary:hover {
          background: #dce6db;
        }
        [data-theme="dark"] .modal-btn-secondary {
          background: #333333;
          color: #c2d8c4;
        }
        [data-theme="dark"] .modal-btn-secondary:hover {
          background: #444444;
        }

        .modal-btn-danger {
          background: #ffe3e3;
          color: #d32f2f;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.2s;
          margin-left: 10px;
        }
        .modal-btn-danger:hover {
          background: #ffcdd2;
        }
        .modal-btn-danger:disabled {
          background: #f5f5f5;
          color: #9e9e9e;
          cursor: not-allowed;
        }
        [data-theme="dark"] .modal-btn-danger {
          background: #4a1c1c;
          color: #ff8a80;
        }
        [data-theme="dark"] .modal-btn-danger:hover {
          background: #5c2323;
        }
        [data-theme="dark"] .modal-btn-danger:disabled {
          background: #2c2c2c;
          color: #555555;
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
