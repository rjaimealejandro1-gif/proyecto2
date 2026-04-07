import { useState, useEffect, useContext, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { AuthContext } from '../context/AuthContext';
import { getUsuarioIdFromUser } from '../utils/userHelpers';

const AcademicCalendar = ({ courseId = null }) => {
  const { user, role } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId) fetchEvents();
  }, [usuarioId, courseId]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let courseIds = [courseId].filter(Boolean);

      if (!courseId && role === 'estudiante') {
        const { data: enrollments } = await supabase
          .from('inscripciones')
          .select('id_curso')
          .eq('id_estudiante', usuarioId);
        courseIds = (enrollments || []).map(e => e.id_curso);
      } else if (!courseId && role === 'docente') {
        const { data: courses } = await supabase
          .from('cursos')
          .select('id_curso')
          .eq('id_docente', usuarioId);
        courseIds = (courses || []).map(c => c.id_curso);
      }

      if (courseIds.length === 0 && !courseId) {
        setEvents([]);
        setLoading(false);
        return;
      }

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data: unitsData } = courseIds.length > 0
        ? await supabase.from('unidades').select('id_unidad, nombre_unidad, id_curso').in('id_curso', courseIds)
        : { data: [] };

      const unitIds = (unitsData || []).map(u => u.id_unidad);
      const unitMap = {};
      (unitsData || []).forEach(u => { unitMap[u.id_unidad] = { nombre_unidad: u.nombre_unidad, id_curso: u.id_curso }; });

      const [tasksRes, quizRes] = await Promise.all([
        unitIds.length > 0
          ? supabase.from('tareas').select('id_tarea, titulo_tarea, fecha_limite, id_unidad').in('id_unidad', unitIds).gte('fecha_limite', startOfMonth.toISOString()).lte('fecha_limite', endOfMonth.toISOString())
          : { data: [] },
        courseIds.length > 0
          ? supabase.from('eventos_calendario').select('*').in('id_curso', courseIds).gte('fecha_inicio', startOfMonth.toISOString()).lte('fecha_inicio', endOfMonth.toISOString())
          : { data: [] },
      ]);

      const taskEvents = (tasksRes.data || []).map(t => ({
        id: t.id_tarea,
        title: t.titulo_tarea,
        date: t.fecha_limite,
        type: 'tarea',
        unitName: unitMap[t.id_unidad]?.nombre_unidad || '',
      }));

      const calendarEvents = (quizRes.data || []).map(e => ({
        id: e.id_evento,
        title: e.titulo,
        date: e.fecha_inicio,
        type: e.tipo,
        description: e.descripcion,
      }));

      setEvents([...taskEvents, ...calendarEvents]);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days = [];

    for (let i = 0; i < startPadding; i++) {
      const prevDate = new Date(year, month, -startPadding + i + 1);
      days.push({ date: prevDate, currentMonth: false });
    }

    for (let day = 1; day <= totalDays; day++) {
      days.push({ date: new Date(year, month, day), currentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false });
    }

    return days;
  }, [currentDate]);

  const getEventsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date?.split('T')[0] === dateStr);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const today = new Date();
  const isToday = (date) => {
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  if (loading) {
    return <div className="ac-loading">Cargando calendario...</div>;
  }

  return (
    <div className="ac-container">
      <div className="ac-header">
        <button className="ac-nav-btn" onClick={prevMonth}>←</button>
        <h3 className="ac-month-title">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
        <button className="ac-nav-btn" onClick={nextMonth}>→</button>
      </div>

      <div className="ac-weekdays">
        {dayNames.map(day => (
          <div key={day} className="ac-weekday">{day}</div>
        ))}
      </div>

      <div className="ac-days">
        {calendarDays.map((day, idx) => {
          const dayEvents = getEventsForDate(day.date);
          const hasEvents = dayEvents.length > 0;
          const selected = selectedDate &&
            day.date.getDate() === selectedDate.getDate() &&
            day.date.getMonth() === selectedDate.getMonth() &&
            day.date.getFullYear() === selectedDate.getFullYear();

          return (
            <div
              key={idx}
              className={`ac-day ${!day.currentMonth ? 'ac-other-month' : ''} ${isToday(day.date) ? 'ac-today' : ''} ${hasEvents ? 'ac-has-events' : ''} ${selected ? 'ac-selected' : ''}`}
              onClick={() => setSelectedDate(day.date)}
            >
              <span className="ac-day-number">{day.date.getDate()}</span>
              {hasEvents && (
                <div className="ac-day-dots">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span key={i} className={`ac-dot ac-dot-${e.type}`}></span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="ac-legend">
        <span className="ac-legend-item"><span className="ac-dot ac-dot-tarea"></span> Tareas</span>
      </div>

      {selectedDate && selectedEvents.length > 0 && (
        <div className="ac-events-panel">
          <h4>Eventos del {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</h4>
          <div className="ac-events-list">
            {selectedEvents.map(event => (
              <div key={event.id} className={`ac-event-item ac-event-${event.type}`}>
                <span className="ac-event-title">{event.title}</span>
                {event.unitName && <span className="ac-event-unit">{event.unitName}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .ac-container { background: var(--bg-elevated); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 12px; border: 1px solid var(--border-default); padding: 20px; }
        .ac-loading { display: flex; justify-content: center; align-items: center; min-height: 300px; color: var(--text-secondary); }
        .ac-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .ac-nav-btn { background: var(--bg-subtle); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: none; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-size: 16px; transition: background 0.2s; }
        .ac-nav-btn:hover { background: var(--border-default); }
        .ac-month-title { font-family: 'Inter', system-ui, sans-serif; font-size: 16px; font-weight: 600; color: var(--text-primary); margin: 0; }
        .ac-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); margin-bottom: 8px; }
        .ac-weekday { text-align: center; font-size: 11px; font-weight: 600; color: var(--text-tertiary); padding: 8px 0; text-transform: uppercase; }
        .ac-days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
        .ac-day { padding: 8px; text-align: center; border-radius: 12px; cursor: pointer; transition: background 0.2s; min-height: 44px; }
        .ac-day:hover { background: var(--bg-subtle); }
        .ac-day.ac-other-month { opacity: 0.3; }
        .ac-day.ac-today { background: var(--info-subtle); }
        .ac-day.ac-today .ac-day-number { color: var(--accent); font-weight: 700; }
        .ac-day.ac-selected { background: var(--accent-subtle); }
        .ac-day.ac-has-events { font-weight: 600; }
        .ac-day-number { font-size: 13px; color: var(--text-primary); display: block; }
        .ac-day-dots { display: flex; justify-content: center; gap: 3px; margin-top: 4px; }
        .ac-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
        .ac-dot-tarea { background: var(--warning); }
        .ac-legend { display: flex; gap: 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--bg-subtle); }
        .ac-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
        .ac-events-panel { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--bg-subtle); }
        .ac-events-panel h4 { font-family: 'Inter', system-ui, sans-serif; font-size: 14px; color: var(--text-primary); margin: 0 0 12px 0; }
        .ac-events-list { display: flex; flex-direction: column; gap: 8px; }
        .ac-event-item { padding: 10px 12px; background: var(--bg-subtle); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-radius: 12px; border-left: 3px solid var(--warning); }
        .ac-event-title { font-size: 13px; color: var(--text-primary); font-weight: 500; display: block; }
        .ac-event-unit { font-size: 11px; color: var(--text-tertiary); }
        @media (max-width: 768px) {
          .ac-day { padding: 4px; min-height: 36px; }
          .ac-day-number { font-size: 11px; }
        }
      `}</style>
    </div>
  );
};

export default AcademicCalendar;
