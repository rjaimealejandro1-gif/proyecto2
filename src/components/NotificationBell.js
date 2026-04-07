import { useState, useEffect, useContext } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';

const NotificationBell = () => {
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getUsuarioId = async () => {
      if (!user) return;
      
      if (user.isAdmin) {
        const { data } = await supabase.from('usuarios').select('id_usuario').eq('numero_identificacion', 'Teseeducativo05').maybeSingle();
        if (data) setUsuarioId(data.id_usuario);
        return;
      }
      
      if (user.id && typeof user.id === 'string' && user.id.length > 10) {
        const { data } = await supabase.from('usuarios').select('id_usuario').eq('auth_id', user.id).maybeSingle();
        if (data) setUsuarioId(data.id_usuario);
      }
    };
    getUsuarioId();
  }, [user]);

  useEffect(() => {
    if (!usuarioId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [usuarioId]);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('id_usuario', usuarioId)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.leida).length);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const markAsRead = async (notifId) => {
    try {
      await supabase.from('notificaciones').update({ leida: true }).eq('id_notificacion', notifId);
      setNotifications(prev => prev.map(n => n.id_notificacion === notifId ? { ...n, leida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.leida).map(n => n.id_notificacion);
      if (unreadIds.length === 0) return;
      await supabase.from('notificaciones').update({ leida: true }).in('id_notificacion', unreadIds);
      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const getIcon = (tipo) => {
    const icons = {
      tarea_calificada: '📝',
      cuestionario_enviado: '📋',
      inscripcion: '🎓',
      entrega_recibida: '📬',
      mensaje_foro: '💬',
      inscripcion_aceptada: '✅',
      fecha_entrega: '⏰',
      nuevo_curso: '🆕',
      calificacion: '🏆',
      default: '🔔',
    };
    return icons[tipo] || icons.default;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = Math.floor((now - new Date(date)) / 1000);
    if (diff < 60) return 'Hace un momento';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)}h`;
    return `Hace ${Math.floor(diff / 86400)} días`;
  };

  return (
    <div className="nb-container">
      <button className="nb-bell-btn" onClick={() => setShowDropdown(!showDropdown)}>
        <span className="nb-bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="nb-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {showDropdown && (
        <div className="nb-dropdown" onClick={(e) => e.stopPropagation()}>
          <div className="nb-header">
            <h3>Notificaciones</h3>
            {unreadCount > 0 && (
              <button className="nb-mark-read" onClick={markAllAsRead}>
                Marcar todas leídas
              </button>
            )}
          </div>

          <div className="nb-list">
            {notifications.length === 0 ? (
              <div className="nb-empty">
                <span>🔔</span>
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id_notificacion}
                  className={`nb-item ${notif.leida ? 'nb-read' : 'nb-unread'}`}
                  onClick={() => !notif.leida && markAsRead(notif.id_notificacion)}
                >
                  <div className="nb-item-icon">{getIcon(notif.tipo)}</div>
                  <div className="nb-item-content">
                    <div className="nb-item-title">{notif.titulo}</div>
                    {notif.mensaje && <div className="nb-item-msg">{notif.mensaje}</div>}
                    <div className="nb-item-time">{getTimeAgo(notif.created_at)}</div>
                  </div>
                  {!notif.leida && <div className="nb-unread-dot"></div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .nb-container { position: relative; }
        .nb-bell-btn {
          position: relative;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          font-size: 20px;
          transition: background 0.2s;
        }
        .nb-bell-btn:hover { background: rgba(99,102,241,0.1); }
        .nb-badge {
          position: absolute;
          top: 2px;
          right: 2px;
          background: var(--danger);
          color: #fff;
          font-size: 10px;
          font-weight: 700;
          min-width: 16px;
          height: 16px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4px;
        }
        .nb-dropdown {
          position: absolute;
          top: 48px;
          right: 0;
          width: 360px;
          max-height: 480px;
          background: var(--bg-elevated);
          border-radius: 16px;
          box-shadow: var(--shadow-float-lg);
          border: 1px solid var(--border-default);
          overflow: hidden;
          z-index: 1000;
        }
        .nb-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-light);
        }
        .nb-header h3 { margin: 0; font-size: 16px; color: var(--text-primary); font-family: 'Outfit', sans-serif; }
        .nb-mark-read {
          background: none;
          border: none;
          color: var(--accent);
          font-size: 12px;
          cursor: pointer;
          font-weight: 500;
        }
        .nb-mark-read:hover { text-decoration: underline; }
        .nb-list { max-height: 420px; overflow-y: auto; }
        .nb-empty {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-tertiary);
        }
        .nb-empty span { font-size: 32px; display: block; margin-bottom: 8px; }
        .nb-empty p { margin: 0; font-size: 14px; }
        .nb-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-light);
          cursor: pointer;
          transition: background 0.15s;
          position: relative;
        }
        .nb-item:hover { background: var(--bg-subtle); }
        .nb-item.nb-unread { background: var(--info-subtle); }
        .nb-item.nb-read { opacity: 0.7; }
        .nb-item-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }
        .nb-item-content { flex: 1; min-width: 0; }
        .nb-item-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }
        .nb-item-msg {
          font-size: 12px;
          color: var(--text-secondary);
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .nb-item-time {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 4px;
        }
        .nb-unread-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
          margin-top: 6px;
        }
        @media (max-width: 768px) {
          .nb-dropdown { width: 300px; right: -80px; }
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;
