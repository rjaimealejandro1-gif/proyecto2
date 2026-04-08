import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const UserManagement = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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
      console.log('Usuarios cargados:', data?.length || 0);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
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

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ nombre: '', email: '', password: '', id_rol: 3 });
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setFormData({ nombre: u.nombre, email: u.email, password: '', id_rol: u.id_rol });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({ nombre: '', email: '', password: '', id_rol: 3 });
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
      if (editingUser) {
        const { error: updateError } = await supabase
          .from('usuarios')
          .update({ nombre: formData.nombre.trim(), id_rol: parseInt(formData.id_rol) })
          .eq('id_usuario', editingUser.id_usuario);

        if (updateError) throw updateError;
        setSuccess('Usuario actualizado correctamente');
      } else {
        const roleMapping = { 1: 'administrador', 2: 'docente', 3: 'estudiante' };
        const { error: signUpError } = await supabase.rpc('create_user_with_role', {
          p_nombre: formData.nombre.trim(),
          p_email: formData.email.trim().toLowerCase(),
          p_password: formData.password,
          p_id_rol: parseInt(formData.id_rol),
        });

        if (signUpError) {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
          });

          if (authError) throw authError;

          if (authData.user) {
            const { error: dbError } = await supabase.from('usuarios').insert([
              {
                auth_id: authData.user.id,
                nombre: formData.nombre.trim(),
                email: formData.email.trim().toLowerCase(),
                contraseña_hash: 'managed_by_supabase_auth',
                id_rol: parseInt(formData.id_rol),
              },
            ]);

            if (dbError) {
              await supabase.auth.admin?.deleteUser(authData.user.id);
              throw dbError;
            }
          }
        }

        setSuccess('Usuario creado correctamente');
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
    console.log('Usuario seleccionado para eliminación:', u);
    console.log('deleteConfirm state:', deleteConfirm);
    setDeleteConfirm(u);
    console.log('deleteConfirm state after set:', u);
  };

  const handleDelete = async () => {
    // Forzar log del estado actual
    console.log('=== handleDelete INVOCADO ===');
    console.log('deleteConfirm al inicio:', deleteConfirm);
    console.log('deleteConfirm.id_usuario:', deleteConfirm?.id_usuario);
    
    if (!deleteConfirm) {
      alert('ERROR: No hay usuario seleccionado para eliminar. deleteConfirm es null.');
      console.log('No deleteConfirm, returning');
      return;
    }
    
    const userId = deleteConfirm.id_usuario;
    const userName = deleteConfirm.nombre;
    
    alert('Iniciando eliminación para: ' + userName + ' (ID: ' + userId + ')');
    
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    console.log('=== INICIANDO ELIMINACIÓN ===');

    try {
      const userId = deleteConfirm.id_usuario;
      const userName = deleteConfirm.nombre;
      const userEmail = deleteConfirm.email;

      console.log('Eliminando usuario ID:', userId, 'Nombre:', userName);

      // HACK: Intentar con update a NULL primero como workaround
      // Esto ayuda a diagnosticar si es problema de RLS
      console.log('Verificando acceso a tabla usuarios...');
      
      // Prueba 1: Verificar que podemos leer
      const { data: testRead, error: testReadError } = await supabase
        .from('usuarios')
        .select('id_usuario')
        .eq('id_usuario', userId)
        .limit(1);
      
      console.log('Test read result:', { testRead, testReadError });

      if (testReadError) {
        throw new Error('No tienes permiso para acceder a la tabla de usuarios: ' + testReadError.message);
      }

      // Prueba 2: Eliminar
      console.log('Intentando eliminar...');
      const { data: deleteResult, error: deleteError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id_usuario', userId)
        .select();

      console.log('Resultado delete:', { deleteResult, deleteError });

      if (deleteError) {
        console.error('Error de Supabase:', deleteError);
        throw new Error(deleteError.message);
      }

      console.log('Eliminación exitosa, recargando...');
      await fetchUsers();

      setSuccess(`✓ Usuario "${userName}" eliminado correctamente`);
      setDeleteConfirm(null);
      
    } catch (err) {
      console.error('Error completo:', err);
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
                  <td className="actions-cell">
                    <button className="btn-delete" onClick={() => confirmDelete(u)} disabled={u.id_rol === 1}>
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
        <div className="modal-overlay" onClick={closeModal}>
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
        </div>
      )}

      {deleteConfirm && (
        <div 
          className="modal-overlay" 
          style={{pointerEvents: 'none'}}
        >
          <div 
            className="modal-content modal-confirm" 
            style={{pointerEvents: 'auto'}}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Confirmar Eliminación</h2>
              <button className="modal-close" onClick={() => setDeleteConfirm(null)}>
                &times;
              </button>
            </div>
              <p className="confirm-text">
              ¿Está seguro de eliminar al usuario <strong>{deleteConfirm?.nombre}</strong>? 
              <br/>
              <small style={{color: '#c45a5a'}}>Esta acción eliminará también todos sus registros relacionados (entregas, calificaciones, inscripciones, etc.)</small>
              </p>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => {
                  console.log('Cancelar eliminación');
                  setDeleteConfirm(null);
                }}>
                  Cancelar
                </button>
              <button 
                type="button"
                className="btn-delete" 
                style={{background: '#c45a5a', color: 'white', padding: '12px 24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'}}
              >
                <span 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    alert('INICIANDO ELIMINACIÓN para: ' + deleteConfirm?.nombre);
                    handleDelete();
                  }}
                  style={{color: 'white', textDecoration: 'none', display: 'block', cursor: 'pointer'}}
                >
                  CONFIRMAR ELIMINACIÓN
                </span>
              </button>
            </div>
          </div>
        </div>
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
        .actions-cell {
          display: flex;
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
        .modal-overlay {
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
        .modal-content {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          width: 100%;
          max-width: 480px;
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
          color: var(--text-secondary);
          font-size: 15px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  );
};

export default UserManagement;
