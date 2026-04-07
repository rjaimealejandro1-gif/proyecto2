import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const CatalogCourses = () => {
  const { user, role } = useContext(AuthContext);
  const navigate = useNavigate();
  const [usuarioId, setUsuarioId] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('recientes');
  const [enrolling, setEnrolling] = useState(null);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    fetchCourses();
    if (usuarioId) fetchEnrollments();
  }, [usuarioId]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select(`
          *,
          usuarios(id_usuario, nombre),
          inscripciones(count)
        `)
        .eq('estado', 'activo')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    try {
      const { data } = await supabase
        .from('inscripciones')
        .select('id_curso')
        .eq('id_estudiante', usuarioId);
      setEnrolledIds(new Set((data || []).map(e => e.id_curso)));
    } catch (err) {
      console.error('Error fetching enrollments:', err);
    }
  };

  const categories = useMemo(() => {
    const cats = [...new Set(courses.map(c => c.categoria).filter(Boolean))];
    return cats.sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let result = [...courses];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c =>
        c.nombre_curso?.toLowerCase().includes(term) ||
        c.descripcion?.toLowerCase().includes(term)
      );
    }

    if (categoryFilter) {
      result = result.filter(c => c.categoria === categoryFilter);
    }

    switch (sortBy) {
      case 'recientes':
        result.sort((a, b) => new Date(b.fecha_creacion) - new Date(a.fecha_creacion));
        break;
      case 'nombre':
        result.sort((a, b) => (a.nombre_curso || '').localeCompare(b.nombre_curso || ''));
        break;
      case 'estudiantes':
        result.sort((a, b) => (b.inscripciones?.[0]?.count || 0) - (a.inscripciones?.[0]?.count || 0));
        break;
      default:
        break;
    }

    return result;
  }, [courses, searchTerm, categoryFilter, sortBy]);

  const handleEnroll = async (courseId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setEnrolling(courseId);
    try {
      const { error } = await supabase.from('inscripciones').insert([{
        id_estudiante: usuarioId,
        id_curso: courseId,
      }]);
      if (error) throw error;
      setEnrolledIds(prev => new Set([...prev, courseId]));

      const course = courses.find(c => c.id_curso === courseId);
      await supabase.from('notificaciones').insert([{
        id_usuario: usuarioId,
        tipo: 'inscripcion_aceptada',
        titulo: 'Inscripción exitosa',
        mensaje: `Te has inscrito en "${course?.nombre_curso}"`,
        enlace: `/estudiante/course/${courseId}`,
      }]);
    } catch (err) {
      console.error('Error enrolling:', err);
    } finally {
      setEnrolling(null);
    }
  };

  if (loading) {
    return <div className="cc-loading">Cargando cursos...</div>;
  }

  return (
    <div className="cc-container">
      <div className="cc-header">
        <div>
          <h1>Catálogo de Cursos</h1>
          <p>Explora y inscríbete en los cursos disponibles</p>
        </div>
      </div>

      <div className="cc-filters-bar">
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
            placeholder="Buscar por nombre o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-premium-input"
          />
          {searchTerm && (
            <button className="cc-clear-search" onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 3, background: 'none', border: 'none', cursor: 'pointer', color: '#c0b9c0', fontSize: '16px', padding: '4px' }}>✕</button>
          )}
        </div>

        <div className="cc-filters">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="cc-select"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="cc-select"
          >
            <option value="recientes">Más recientes</option>
            <option value="nombre">Por nombre</option>
            <option value="estudiantes">Más populares</option>
          </select>
        </div>
      </div>

      <div className="cc-results-info">
        <span>{filteredCourses.length} curso{filteredCourses.length !== 1 ? 's' : ''} encontrado{filteredCourses.length !== 1 ? 's' : ''}</span>
        {(searchTerm || categoryFilter) && (
          <button
            className="cc-clear-filters"
            onClick={() => { setSearchTerm(''); setCategoryFilter(''); }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {filteredCourses.length === 0 ? (
        <div className="cc-empty">
          <span className="cc-empty-icon">📚</span>
          <h3>No se encontraron cursos</h3>
          <p>Intenta con otros términos de búsqueda o filtros</p>
        </div>
      ) : (
        <div className="cc-grid">
          {filteredCourses.map((course) => {
            const isEnrolled = enrolledIds.has(course.id_curso);
            const studentCount = course.inscripciones?.[0]?.count || 0;

            return (
              <div key={course.id_curso} className="cc-card">
                <div
                  className="cc-card-image"
                  style={{
                    backgroundImage: course.imagen_url
                      ? `url(${course.imagen_url})`
                      : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
                  }}
                >
                  <span className="cc-card-category">{course.categoria || 'General'}</span>
                </div>

                <div className="cc-card-body">
                  <h3 className="cc-card-title">{course.nombre_curso}</h3>
                  <p className="cc-card-desc">{course.descripcion}</p>

                  <div className="cc-card-meta">
                    <span className="cc-card-teacher">
                      👤 {course.usuarios?.nombre || 'Docente'}
                    </span>
                    <span className="cc-card-students">
                      👥 {studentCount} estudiante{studentCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="cc-card-footer">
                    <Link to={`/course/${course.id_curso}`} className="cc-btn-details">
                      Ver detalles
                    </Link>
                    {isEnrolled ? (
                      <span className="cc-enrolled-badge">✓ Inscrito</span>
                    ) : (
                      <button
                        className="cc-btn-enroll"
                        onClick={() => handleEnroll(course.id_curso)}
                        disabled={enrolling === course.id_curso}
                      >
                        {enrolling === course.id_curso ? 'Inscribiendo...' : 'Inscribirme'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .cc-container { padding: 0; max-width: 100%; }
        .cc-loading { display: flex; justify-content: center; align-items: center; min-height: 400px; font-size: 16px; color: var(--text-tertiary); }
        .cc-header { margin-bottom: 28px; }
        .cc-header h1 { font-family: 'Outfit', sans-serif; font-size: clamp(1.5rem, 2.5vw, 2rem); color: var(--text-primary); margin: 0 0 6px 0; font-weight: 700; letter-spacing: -0.4px; }
        .cc-header p { color: var(--text-secondary); margin: 0; font-size: 0.9rem; }
        .cc-filters-bar { display: flex; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
        .cc-search-box { flex: 1; min-width: 250px; position: relative; display: flex; align-items: center; }
        .cc-search-icon { position: absolute; left: 14px; font-size: 15px; pointer-events: none; color: var(--text-tertiary); }
        .cc-search-input { width: 100%; padding: 12px 38px; border: 1.5px solid var(--border-default); border-radius: 12px; font-size: 0.875rem; outline: none; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); background: var(--bg-surface); color: var(--text-primary); }
        .cc-search-input:focus { border-color: var(--accent); background: var(--bg-elevated); box-shadow: 0 0 0 4px var(--accent-subtle); }
        .cc-clear-search { position: absolute; right: 12px; background: none; border: none; cursor: pointer; color: var(--text-tertiary); font-size: 14px; padding: 4px; }
        .cc-filters { display: flex; gap: 10px; flex-wrap: wrap; }
        .cc-select { padding: 12px 14px; border: 1.5px solid var(--border-default); border-radius: 12px; font-size: 0.825rem; outline: none; background: var(--bg-surface); color: var(--text-primary); cursor: pointer; min-width: 150px; font-family: inherit; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
        .cc-select:focus { border-color: var(--accent); box-shadow: 0 0 0 4px var(--accent-subtle); }
        .cc-results-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 0.825rem; color: var(--text-secondary); }
        .cc-clear-filters { background: none; border: none; color: var(--accent); cursor: pointer; font-size: 0.775rem; font-weight: 600; }
        .cc-clear-filters:hover { color: var(--accent-light); text-decoration: none; }
        .cc-empty { text-align: center; padding: 60px 20px; background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-light); box-shadow: var(--shadow-outset-sm); }
        .cc-empty-icon { font-size: 48px; display: block; margin-bottom: 16px; opacity: 0.35; }
        .cc-empty h3 { color: var(--text-secondary); margin: 0 0 8px 0; font-family: 'Outfit', sans-serif; font-weight: 600; font-size: 1rem; }
        .cc-empty p { color: var(--text-tertiary); margin: 0; font-size: 0.85rem; }
        .cc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 22px; }
        .cc-card { background: var(--bg-surface); border-radius: 20px; border: 1px solid var(--border-light); overflow: hidden; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: var(--shadow-outset-sm); }
        .cc-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-outset); }
        .cc-card-image { height: 160px; background-size: cover; background-position: center; position: relative; }
        .cc-card-category { position: absolute; top: 12px; left: 12px; background: rgba(0,0,0,0.5); color: #fff; font-size: 0.65rem; padding: 4px 10px; border-radius: 100px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; backdrop-filter: blur(8px); }
        .cc-card-body { padding: 18px; }
        .cc-card-title { font-family: 'Outfit', sans-serif; font-size: 0.95rem; color: var(--text-primary); margin: 0 0 8px 0; font-weight: 600; }
        .cc-card-desc { font-size: 0.8rem; color: var(--text-secondary); margin: 0 0 12px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.5; }
        .cc-card-meta { display: flex; gap: 12px; margin-bottom: 12px; font-size: 0.7rem; color: var(--text-tertiary); }
        .cc-card-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border-light); }
        .cc-btn-details { color: var(--accent); text-decoration: none; font-size: 0.775rem; font-weight: 600; }
        .cc-btn-details:hover { color: var(--accent-light); text-decoration: none; }
        .cc-btn-enroll { background: var(--gradient-accent); color: #fff; border: none; padding: 8px 16px; border-radius: 10px; font-size: 0.775rem; cursor: pointer; font-weight: 600; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 3px 10px rgba(91, 141, 239, 0.2); font-family: inherit; }
        .cc-btn-enroll:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(91, 141, 239, 0.3); }
        .cc-btn-enroll:disabled { background: var(--accent-subtle); color: var(--text-tertiary); cursor: not-allowed; box-shadow: none; transform: none; }
        .cc-enrolled-badge { background: var(--success-subtle); color: var(--success); padding: 6px 12px; border-radius: 100px; font-size: 0.65rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
        @media (max-width: 768px) {
          .cc-container { padding: 0; }
          .cc-filters-bar { flex-direction: column; }
          .cc-filters { width: 100%; }
          .cc-select { flex: 1; min-width: auto; }
          .cc-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default CatalogCourses;
