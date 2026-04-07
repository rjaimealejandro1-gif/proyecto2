import { useState, useEffect, useContext } from 'react';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState({ totalUsers: 0, totalCourses: 0, totalEnrollments: 0, totalForums: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, coursesRes, enrollmentsRes, forumsRes, recentUsersRes, recentCoursesRes] = await Promise.all([
        supabase.from('usuarios').select('id_usuario', { count: 'exact', head: true }),
        supabase.from('cursos').select('id_curso', { count: 'exact', head: true }),
        supabase.from('inscripciones').select('id_inscripcion', { count: 'exact', head: true }),
        supabase.from('foros').select('id_foro', { count: 'exact', head: true }),
        supabase.from('usuarios').select('id_usuario, nombre, email, fecha_registro, id_rol').order('fecha_registro', { ascending: false }).limit(5),
        supabase.from('cursos').select('id_curso, nombre_curso, categoria, estado, fecha_creacion').order('fecha_creacion', { ascending: false }).limit(5),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (coursesRes.error) throw coursesRes.error;
      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (forumsRes.error) throw forumsRes.error;

      setStats({
        totalUsers: usersRes.count || 0,
        totalCourses: coursesRes.count || 0,
        totalEnrollments: enrollmentsRes.count || 0,
        totalForums: forumsRes.count || 0,
      });

      setRecentUsers(recentUsersRes.data || []);
      setRecentCourses(recentCoursesRes.data || []);
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

  if (loading) {
    return <div className="admin-dashboard-loading">Cargando dashboard...</div>;
  }

  return (
    <div className="admin-dashboard">
      <div className="admin-dashboard-header">
        <h1>Panel de Administración</h1>
        <p>Bienvenido, {user?.email}</p>
      </div>

      {error && <div className="admin-error-message">{error}</div>}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-users">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div className="stat-info">
            <h3>{stats.totalUsers}</h3>
            <p>Total Usuarios</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-courses">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
          </div>
          <div className="stat-info">
            <h3>{stats.totalCourses}</h3>
            <p>Total Cursos</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-enrollments">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>
          </div>
          <div className="stat-info">
            <h3>{stats.totalEnrollments}</h3>
            <p>Total Inscripciones</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon stat-icon-forums">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg>
          </div>
          <div className="stat-info">
            <h3>{stats.totalForums}</h3>
            <p>Total Foros</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content-grid">
        <div className="dashboard-section">
          <h2>Usuarios Recientes</h2>
          {recentUsers.length === 0 ? (
            <p className="no-data-message">No hay usuarios registrados</p>
          ) : (
            <div className="table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Fecha Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {recentUsers.map((u) => (
                    <tr key={u.id_usuario}>
                      <td>{u.nombre}</td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${getRoleBadgeClass(u.id_rol)}`}>
                          {getRoleLabel(u.id_rol)}
                        </span>
                      </td>
                      <td>{new Date(u.fecha_registro).toLocaleDateString('es-ES')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="dashboard-section">
          <h2>Cursos Recientes</h2>
          {recentCourses.length === 0 ? (
            <p className="no-data-message">No hay cursos creados</p>
          ) : (
            <div className="courses-list">
              {recentCourses.map((c) => (
                <div key={c.id_curso} className="course-card-mini">
                  <div className="course-card-info">
                    <h4>{c.nombre_curso}</h4>
                    <span className={`badge ${c.estado === 'activo' ? 'badge-active' : 'badge-inactive'}`}>
                      {c.estado}
                    </span>
                    <span className="course-category">{c.categoria}</span>
                  </div>
                  <span className="course-date">{new Date(c.fecha_creacion).toLocaleDateString('es-ES')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        .admin-dashboard {
          padding: 0;
          max-width: 100%;
          margin: 0 auto;
        }
        .admin-dashboard-loading {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 400px;
          font-size: 18px;
          color: var(--text-secondary);
        }
        .admin-dashboard-header {
          margin-bottom: 32px;
        }
        .admin-dashboard-header h1 {
          font-size: 28px;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          margin: 0 0 4px 0;
        }
        .admin-dashboard-header p {
          color: var(--text-secondary);
          margin: 0;
        }
        .admin-error-message {
          background: var(--danger-subtle);
          color: var(--danger);
          padding: 12px 16px;
          border-radius: 10px;
          margin-bottom: 24px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }
        .stat-card {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-default);
        }
        .stat-icon {
          font-size: 36px;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
        }
        .stat-icon-users { background: var(--info-subtle); }
        .stat-icon-courses { background: var(--success-subtle); }
        .stat-icon-enrollments { background: var(--warning-subtle); }
        .stat-icon-forums { background: rgba(212, 107, 107, 0.1); }
        .stat-info h3 {
          font-size: 28px;
          margin: 0;
          color: var(--text-primary);
        }
        .stat-info p {
          margin: 0;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .dashboard-content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
        }
        @media (max-width: 768px) {
          .dashboard-content-grid {
            grid-template-columns: 1fr;
          }
        }
        .dashboard-section {
          background: var(--bg-surface);
          border-radius: 20px;
          padding: 24px;
          box-shadow: var(--shadow-outset-sm);
          border: 1px solid var(--border-default);
        }
        .dashboard-section h2 {
          font-size: 18px;
          font-family: 'Outfit', sans-serif;
          color: var(--text-primary);
          margin: 0 0 16px 0;
        }
        .no-data-message {
          color: var(--text-tertiary);
          text-align: center;
          padding: 24px;
        }
        .table-container {
          overflow-x: auto;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }
        .admin-table th,
        .admin-table td {
          padding: 10px 12px;
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
        .badge-active { background: var(--success-subtle); color: var(--success); }
        .badge-inactive { background: var(--danger-subtle); color: var(--danger); }
        .courses-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .course-card-mini {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: var(--bg-subtle);
          border-radius: 12px;
          border: 1px solid var(--border-default);
        }
        .course-card-info h4 {
          margin: 0 0 6px 0;
          font-size: 14px;
          color: var(--text-primary);
        }
        .course-card-info .badge {
          margin-right: 8px;
        }
        .course-category {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .course-date {
          font-size: 12px;
          color: var(--text-tertiary);
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
