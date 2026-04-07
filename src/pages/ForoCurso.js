import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import { getUsuarioIdFromUser } from '../utils/userHelpers';

const FORO_CSS = `
.foro-container { max-width: 100%; margin: 0 auto; padding: 0; }
.foro-header { margin-bottom: 32px; }
.foro-header .foro-titulo { font-size: 28px; color: var(--text-primary); margin: 16px 0 8px; font-family: 'Outfit', sans-serif; }
.foro-curso-nombre { color: var(--text-secondary); font-size: 14px; margin: 0; }
.foro-btn { padding: 8px 16px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.2s; }
.foro-btn-back { background: var(--bg-subtle); color: var(--text-primary); }
.foro-btn-back:hover { background: var(--border-default); }
.foro-btn-primary { background: var(--accent); color: var(--bg-surface); }
.foro-btn-primary:hover { background: var(--accent); opacity: 0.85; }
.foro-btn-primary:disabled { background: var(--accent-medium); cursor: not-allowed; }
.foro-btn-secondary { background: var(--bg-subtle); color: var(--text-primary); }
.foro-btn-reply { background: none; color: var(--accent); padding: 4px 12px; border: 1px solid var(--border-default); }
.foro-btn-reply:hover { background: var(--info-subtle); }
.foro-btn-delete { background: none; color: var(--danger); padding: 4px 12px; border: 1px solid var(--danger-subtle); }
.foro-btn-delete:hover { background: var(--danger-subtle); }
.foro-error { background: var(--danger-subtle); color: var(--danger); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(212, 107, 107, 0.2); }
.foro-success { background: var(--success-subtle); color: var(--success); padding: 12px 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid rgba(92, 184, 138, 0.2); }
.foro-nuevo-mensaje { background: var(--bg-surface); border-radius: 20px; padding: 24px; margin-bottom: 32px; border: 1px solid var(--border-default); }
.foro-nuevo-mensaje .foro-subtitulo { font-size: 18px; color: var(--text-primary); margin: 0 0 16px; font-family: 'Outfit', sans-serif; }
.foro-form { display: flex; flex-direction: column; gap: 16px; }
.foro-mensajes .foro-subtitulo { font-size: 18px; color: var(--text-primary); margin: 0 0 20px; font-family: 'Outfit', sans-serif; }
.foro-sin-mensajes { text-align: center; padding: 48px; color: var(--text-tertiary); background: var(--bg-subtle); border-radius: 20px; }
.foro-mensaje { background: var(--bg-surface); border-radius: 20px; padding: 20px; margin-bottom: 16px; border: 1px solid var(--border-default); transition: box-shadow 0.2s; }
.foro-mensaje:hover { box-shadow: var(--shadow-outset-sm); }
.foro-mensaje-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.foro-mensaje-autor { font-weight: 600; color: var(--text-primary); font-size: 14px; }
.foro-mensaje-fecha { font-size: 12px; color: var(--text-tertiary); }
.foro-mensaje-contenido { font-size: 15px; line-height: 1.7; color: var(--text-primary); margin-bottom: 12px; word-wrap: break-word; overflow-wrap: break-word; }
.foro-mensaje-contenido p { margin: 0 0 8px; }
.foro-mensaje-contenido p:last-child { margin-bottom: 0; }
.foro-mensaje-contenido h1, .foro-mensaje-contenido h2, .foro-mensaje-contenido h3 { color: var(--text-primary); margin: 12px 0 8px; font-family: 'Outfit', sans-serif; }
.foro-mensaje-contenido h1:first-child, .foro-mensaje-contenido h2:first-child, .foro-mensaje-contenido h3:first-child { margin-top: 0; }
.foro-mensaje-contenido ul, .foro-mensaje-contenido ol { padding-left: 24px; margin: 8px 0; }
.foro-mensaje-contenido li { margin-bottom: 4px; }
.foro-mensaje-contenido a { color: var(--accent); text-decoration: underline; }
.foro-mensaje-contenido code { background: var(--bg-subtle); padding: 2px 6px; border-radius: 10px; font-family: monospace; font-size: 13px; color: var(--danger); }
.foro-mensaje-contenido pre { background: var(--bg-elevated); color: var(--text-secondary); padding: 16px; border-radius: 12px; overflow-x: auto; margin: 12px 0; border: 1px solid var(--border-default); }
.foro-mensaje-contenido pre code { background: none; color: inherit; padding: 0; }
.foro-mensaje-contenido blockquote { border-left: 3px solid var(--accent); padding-left: 16px; margin: 12px 0; color: var(--text-secondary); }
.foro-mensaje-contenido strong { font-weight: 600; }
.foro-mensaje-contenido em { font-style: italic; }
.foro-mensaje-acciones { display: flex; gap: 8px; align-items: center; }
.foro-respuestas { margin-top: 16px; padding-left: 24px; border-left: 2px solid var(--border-default); }
.foro-respuesta { background: var(--bg-subtle); margin-bottom: 12px; }
.foro-reply-form { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--bg-subtle); display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 768px) { .foro-container { padding: 16px; } .foro-mensaje { padding: 16px; } .foro-mensaje-header { flex-direction: column; align-items: flex-start; gap: 4px; } }
`;

const ForoCurso = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user, session } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [curso, setCurso] = useState(null);
  const [foro, setForo] = useState(null);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [enviandoReply, setEnviandoReply] = useState(false);
  const [eliminando, setEliminando] = useState(null);

  useEffect(() => {
    if (!session) { navigate('/login'); return; }
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [session, user]);

  useEffect(() => { if (usuarioId) cargarDatos(); }, [courseId, usuarioId]);

  const cargarDatos = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: cursoData, error: cursoError } = await supabase.from('cursos').select('*').eq('id_curso', courseId).single();
      if (cursoError) throw cursoError;
      setCurso(cursoData);

      let { data: foroData, error: foroError } = await supabase.from('foros').select('*').eq('id_curso', courseId).single();
      if (foroError && foroError.code === 'PGRST116') {
        const tituloForo = "Foro del curso: " + (cursoData.nombre_curso || cursoData.titulo || 'Curso');
        const { data: nuevoForo, error: createError } = await supabase.from('foros').insert({ id_curso: courseId, titulo_foro: tituloForo }).select().single();
        if (createError) throw createError;
        foroData = nuevoForo;
      } else if (foroError) { throw foroError; }
      setForo(foroData);

      const { data: mensajesData, error: mensajesError } = await supabase.from('mensajes_foro').select('*, usuarios (nombre, email)').eq('id_foro', foroData.id_foro).order('fecha_mensaje', { ascending: false });
      if (mensajesError) throw mensajesError;
      setMensajes(mensajesData || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar el foro. Intente nuevamente.');
    } finally { setLoading(false); }
  };

  const handleCrearMensaje = async (e) => {
    e.preventDefault();
    if (!nuevoMensaje.trim() || nuevoMensaje === '<p><br></p>') return;
    setEnviando(true);
    setError('');
    setSuccess('');
    try {
      const { error: insertError } = await supabase.from('mensajes_foro').insert({
        id_foro: foro.id_foro, id_usuario: usuarioId, contenido: nuevoMensaje.trim(),
        fecha_mensaje: new Date().toISOString(), id_respuesta_a: null,
      });
      if (insertError) throw insertError;
      setSuccess('Mensaje publicado correctamente.');
      setNuevoMensaje('');
      await cargarDatos();
    } catch (err) {
      console.error('Error al crear mensaje:', err);
      setError('Error al publicar el mensaje. Intente nuevamente.');
    } finally { setEnviando(false); }
  };

  const handleResponder = async (idMensaje) => {
    if (!replyContent.trim() || replyContent === '<p><br></p>') return;
    setEnviandoReply(true);
    setError('');
    setSuccess('');
    try {
      const { error: insertError } = await supabase.from('mensajes_foro').insert({
        id_foro: foro.id_foro, id_usuario: usuarioId, contenido: replyContent.trim(),
        fecha_mensaje: new Date().toISOString(), id_respuesta_a: idMensaje,
      });
      if (insertError) throw insertError;
      setSuccess('Respuesta publicada correctamente.');
      setReplyContent('');
      setReplyingTo(null);
      await cargarDatos();
    } catch (err) {
      console.error('Error al responder:', err);
      setError('Error al publicar la respuesta. Intente nuevamente.');
    } finally { setEnviandoReply(false); }
  };

  const handleEliminar = async (idMensaje) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este mensaje?')) return;
    setEliminando(idMensaje);
    setError('');
    setSuccess('');
    try {
      const { error: deleteError } = await supabase.from('mensajes_foro').delete().eq('id_mensaje', idMensaje);
      if (deleteError) throw deleteError;
      setSuccess('Mensaje eliminado correctamente.');
      await cargarDatos();
    } catch (err) {
      console.error('Error al eliminar:', err);
      setError('Error al eliminar el mensaje. Intente nuevamente.');
    } finally { setEliminando(null); }
  };

  const toggleReply = (idMensaje) => {
    if (replyingTo === idMensaje) { setReplyingTo(null); setReplyContent(''); }
    else { setReplyingTo(idMensaje); setReplyContent(''); }
  };

  const getNombreAutor = (mensaje) => {
    if (!mensaje.usuarios) return 'Usuario desconocido';
    return (mensaje.usuarios.nombre || '') + ' ' + (mensaje.usuarios.apellido || '');
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '';
    return new Date(fecha).toLocaleString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const mensajesPrincipales = (mensajes || []).filter((m) => m.id_respuesta_a === null);
  const obtenerRespuestas = (idMensaje) => (mensajes || []).filter((m) => m.id_respuesta_a === idMensaje);
  const puedeEliminar = (mensaje) => { if (!user) return false; return user.role === 'admin' || user.rol === 'admin' || mensaje.id_usuario === usuarioId; };

  if (loading) return <div className="foro-container"><div className="foro-loading">Cargando foro...</div></div>;
  if (error && !foro) return <div className="foro-container"><div className="foro-error">{error}</div><button className="foro-btn foro-btn-secondary" onClick={() => navigate(-1)}>Volver</button></div>;

  return (
    <div className="foro-container">
      <style>{FORO_CSS}</style>
      <div className="foro-header">
        <button className="foro-btn foro-btn-back" onClick={() => navigate(-1)}>&larr; Volver</button>
        <h1 className="foro-titulo">{foro?.titulo_foro || 'Foro del curso'}</h1>
        {curso && <p className="foro-curso-nombre">Curso: {curso.nombre_curso || curso.titulo}</p>}
      </div>
      {error && <div className="foro-error">{error}</div>}
      {success && <div className="foro-success">{success}</div>}
      <div className="foro-nuevo-mensaje">
        <h2 className="foro-subtitulo">Nuevo mensaje</h2>
        <form onSubmit={handleCrearMensaje} className="foro-form">
          <RichTextEditor value={nuevoMensaje} onChange={setNuevoMensaje} placeholder="Escribe tu mensaje aqui..." height="150px" />
          <button type="submit" className="foro-btn foro-btn-primary" disabled={enviando || !nuevoMensaje.trim() || nuevoMensaje === '<p><br></p>'} style={{ alignSelf: 'flex-start' }}>
            {enviando ? 'Publicando...' : 'Publicar mensaje'}
          </button>
        </form>
      </div>
      <div className="foro-mensajes">
        <h2 className="foro-subtitulo">Mensajes ({mensajesPrincipales.length})</h2>
        {mensajesPrincipales.length === 0 ? (
          <p className="foro-sin-mensajes">No hay mensajes aun. Se el primero en publicar!</p>
        ) : (
          mensajesPrincipales.map((mensaje) => {
            const respuestas = obtenerRespuestas(mensaje.id_mensaje);
            return (
              <div key={mensaje.id_mensaje} className="foro-mensaje">
                <div className="foro-mensaje-header">
                  <span className="foro-mensaje-autor">{getNombreAutor(mensaje)}</span>
                  <span className="foro-mensaje-fecha">{formatearFecha(mensaje.fecha_mensaje)}</span>
                </div>
                <div className="foro-mensaje-contenido" dangerouslySetInnerHTML={{ __html: mensaje.contenido }} />
                <div className="foro-mensaje-acciones">
                  <button className="foro-btn foro-btn-reply" onClick={() => toggleReply(mensaje.id_mensaje)}>{replyingTo === mensaje.id_mensaje ? 'Cancelar' : 'Responder'}</button>
                  {puedeEliminar(mensaje) && <button className="foro-btn foro-btn-delete" onClick={() => handleEliminar(mensaje.id_mensaje)} disabled={eliminando === mensaje.id_mensaje}>{eliminando === mensaje.id_mensaje ? 'Eliminando...' : 'Eliminar'}</button>}
                </div>
                {replyingTo === mensaje.id_mensaje && (
                  <div className="foro-reply-form">
                    <RichTextEditor value={replyContent} onChange={setReplyContent} placeholder="Escribe tu respuesta..." height="120px" />
                    <button className="foro-btn foro-btn-primary" onClick={() => handleResponder(mensaje.id_mensaje)} disabled={enviandoReply || !replyContent.trim() || replyContent === '<p><br></p>'} style={{ alignSelf: 'flex-start' }}>{enviandoReply ? 'Enviando...' : 'Enviar respuesta'}</button>
                  </div>
                )}
                {respuestas.length > 0 && (
                  <div className="foro-respuestas">
                    {respuestas.map((respuesta) => (
                      <div key={respuesta.id_mensaje} className="foro-mensaje foro-respuesta">
                        <div className="foro-mensaje-header">
                          <span className="foro-mensaje-autor">{getNombreAutor(respuesta)}</span>
                          <span className="foro-mensaje-fecha">{formatearFecha(respuesta.fecha_mensaje)}</span>
                        </div>
                        <div className="foro-mensaje-contenido" dangerouslySetInnerHTML={{ __html: respuesta.contenido }} />
                        <div className="foro-mensaje-acciones">
                          <button className="foro-btn foro-btn-reply" onClick={() => toggleReply(respuesta.id_mensaje)}>{replyingTo === respuesta.id_mensaje ? 'Cancelar' : 'Responder'}</button>
                          {puedeEliminar(respuesta) && <button className="foro-btn foro-btn-delete" onClick={() => handleEliminar(respuesta.id_mensaje)} disabled={eliminando === respuesta.id_mensaje}>{eliminando === respuesta.id_mensaje ? 'Eliminando...' : 'Eliminar'}</button>}
                        </div>
                        {replyingTo === respuesta.id_mensaje && (
                          <div className="foro-reply-form">
                            <RichTextEditor value={replyContent} onChange={setReplyContent} placeholder="Escribe tu respuesta..." height="120px" />
                            <button className="foro-btn foro-btn-primary" onClick={() => handleResponder(respuesta.id_mensaje)} disabled={enviandoReply || !replyContent.trim() || replyContent === '<p><br></p>'} style={{ alignSelf: 'flex-start' }}>{enviandoReply ? 'Enviando...' : 'Enviar respuesta'}</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ForoCurso;
