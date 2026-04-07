import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { getUsuarioIdFromUser } from '../../utils/userHelpers';

const ResponderCuestionario = () => {
  const { cuestionarioId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [usuarioId, setUsuarioId] = useState(null);

  const [quiz, setQuiz] = useState(null);
  const [course, setCourse] = useState(null);
  const [unit, setUnit] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    const fetchUsuarioId = async () => {
      if (!user) return;
      const id = await getUsuarioIdFromUser(user);
      if (id) setUsuarioId(id);
    };
    fetchUsuarioId();
  }, [user]);

  useEffect(() => {
    if (usuarioId) fetchQuiz();
  }, [cuestionarioId, usuarioId]);

  const fetchQuiz = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: quizData, error: quizError } = await supabase
        .from('cuestionarios')
        .select('*')
        .eq('id_cuestionario', cuestionarioId)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quizData) { setLoading(false); return; }
      setQuiz(quizData);

      if (quizData.id_unidad) {
        const { data: unitData } = await supabase
          .from('unidades')
          .select('*')
          .eq('id_unidad', quizData.id_unidad)
          .maybeSingle();

        if (unitData) {
          setUnit(unitData);
          const { data: courseData } = await supabase
            .from('cursos')
            .select('*')
            .eq('id_curso', unitData.id_curso)
            .maybeSingle();
          if (courseData) setCourse(courseData);
        }
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from('preguntas')
        .select('*')
        .eq('id_cuestionario', cuestionarioId)
        .order('id_pregunta', { ascending: true });

      if (questionsError) throw questionsError;

      const questionsWithOptions = [];
      for (const q of (questionsData || [])) {
        if (q.tipo === 'abierta') continue;
        const { data: optionsData } = await supabase
          .from('opciones')
          .select('*')
          .eq('id_pregunta', q.id_pregunta)
          .order('id_opcion', { ascending: true });

        questionsWithOptions.push({
          ...q,
          opciones: optionsData || [],
        });
      }

      setQuestions(questionsWithOptions);

      const questionIds = questionsWithOptions.map((q) => q.id_pregunta);
      let existingAnswers = [];
      if (questionIds.length > 0) {
        const { data: existingData } = await supabase
          .from('respuestas_estudiante')
          .select('id_pregunta, id_opcion_seleccionada')
          .eq('id_estudiante', usuarioId)
          .in('id_pregunta', questionIds);
        if (existingData) existingAnswers = existingData;
      }

      if (existingAnswers && existingAnswers.length > 0) {
        setAlreadyAnswered(true);
        const initialAnswers = {};
        existingAnswers.forEach((a) => {
          if (a.id_opcion_seleccionada) {
            initialAnswers[a.id_pregunta] = a.id_opcion_seleccionada;
          }
        });
        setAnswers(initialAnswers);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      let correctCount = 0;
      const totalQuestions = questions.length;
      const resultsDetail = [];

      const respuestasToInsert = [];
      for (const q of questions) {
        if (q.tipo === 'verdadero_falso') {
          const selectedVF = answers[q.id_pregunta];
          if (selectedVF) {
            const correctOption = q.opciones.find((o) => o.es_correcta === true);
            const correctAnswerText = correctOption ? correctOption.texto_opcion : '';
            const isCorrect = (selectedVF === 'vf_true' && correctAnswerText === 'Verdadero') ||
                              (selectedVF === 'vf_false' && correctAnswerText === 'Falso');
            if (isCorrect) correctCount++;

            respuestasToInsert.push({
              id_estudiante: usuarioId,
              id_pregunta: q.id_pregunta,
              id_opcion_seleccionada: null,
              respuesta_abierta: selectedVF === 'vf_true' ? 'Verdadero' : 'Falso',
              fecha_respuesta: new Date().toISOString(),
            });

            resultsDetail.push({
              questionId: q.id_pregunta,
              textoPregunta: q.texto_pregunta,
              selectedOptionText: selectedVF === 'vf_true' ? 'Verdadero' : 'Falso',
              correctOptionText: correctAnswerText,
              isCorrect,
            });
          }
        } else {
          const selectedOptionId = answers[q.id_pregunta];
          if (selectedOptionId) {
            respuestasToInsert.push({
              id_estudiante: usuarioId,
              id_pregunta: q.id_pregunta,
              id_opcion_seleccionada: selectedOptionId,
              fecha_respuesta: new Date().toISOString(),
            });

            const correctOption = q.opciones.find((o) => o.es_correcta === true);
            const isCorrect = correctOption && correctOption.id_opcion === selectedOptionId;
            if (isCorrect) correctCount++;

            resultsDetail.push({
              questionId: q.id_pregunta,
              textoPregunta: q.texto_pregunta,
              selectedOptionId,
              selectedOptionText: q.opciones.find((o) => o.id_opcion === selectedOptionId)?.texto_opcion || '',
              correctOptionText: correctOption ? correctOption.texto_opcion : '',
              isCorrect,
            });
          }
        }
      }

      if (respuestasToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('respuestas_estudiante')
          .upsert(respuestasToInsert, { onConflict: 'id_estudiante,id_pregunta' });
        if (insertError) throw insertError;
      }

      const score = totalQuestions > 0 ? parseFloat(((correctCount / totalQuestions) * 100).toFixed(2)) : 0;

      const { data: existingGrade } = await supabase
        .from('calificaciones')
        .select('id_calificacion')
        .eq('id_estudiante', usuarioId)
        .eq('id_curso', course?.id_curso)
        .eq('tipo_referencia', 'cuestionario')
        .eq('id_referencia', cuestionarioId)
        .maybeSingle();

      const gradeData = {
        id_estudiante: usuarioId,
        id_curso: course?.id_curso,
        tipo_referencia: 'cuestionario',
        id_referencia: cuestionarioId,
        nota_obtenida: score,
        fecha_calificacion: new Date().toISOString(),
        nombre_actividad: quiz?.titulo_cuestionario || null,
      };

      if (existingGrade) {
        const { error: updateError } = await supabase
          .from('calificaciones')
          .update(gradeData)
          .eq('id_calificacion', existingGrade.id_calificacion);
        if (updateError) throw updateError;
      } else {
        const { error: insertGradeError } = await supabase
          .from('calificaciones')
          .insert([gradeData]);
        if (insertGradeError) throw insertGradeError;
      }

      setResults({
        score,
        correctCount,
        totalQuestions,
        details: resultsDetail,
      });
    } catch (err) {
      setError(err.message || 'Error al enviar el cuestionario');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="rc-loading">Cargando cuestionario...</div>;
  if (!quiz) {
    return (
      <div className="rc-not-found">
        <h2>Cuestionario no encontrado</h2>
        <Link to="/estudiante/my-courses" className="rc-btn-back">Volver a mis cursos</Link>
      </div>
    );
  }

  if (results) {
    return (
      <div className="rc-container">
        <div className="rc-results">
          <div className="rc-results-header">
            <h1>Resultados del Cuestionario</h1>
            <h2>{quiz.titulo_cuestionario}</h2>
          </div>

          <div className="rc-score-card">
            <div className={`rc-score-circle ${results.score >= 60 ? 'rc-score-pass' : 'rc-score-fail'}`}>
              <span className="rc-score-number">{results.score.toFixed(1)}</span>
              <span className="rc-score-label">/ 100</span>
            </div>
            <div className="rc-score-summary">
              <p>
                <span className="rc-correct">{results.correctCount} correctas</span>
                {' '}de {results.totalQuestions} preguntas
              </p>
              <p className={results.score >= 60 ? 'rc-status-pass' : 'rc-status-fail'}>
                {results.score >= 60 ? 'Aprobado' : 'Reprobado'}
              </p>
            </div>
          </div>

          <div className="rc-results-detail">
            <h3>Detalle por Pregunta</h3>
            {results.details.map((detail, idx) => (
              <div key={detail.questionId} className={`rc-question-result ${detail.isCorrect ? 'rc-result-correct' : 'rc-result-incorrect'}`}>
                <div className="rc-question-result-header">
                  <span className="rc-question-number">Pregunta {idx + 1}</span>
                  <span className={`rc-result-badge ${detail.isCorrect ? 'rc-badge-correct' : 'rc-badge-incorrect'}`}>
                    {detail.isCorrect ? 'Correcta' : 'Incorrecta'}
                  </span>
                </div>
                <p className="rc-question-text">{detail.textoPregunta}</p>
                <div className="rc-answer-detail">
                  <p>
                    <span className="rc-answer-label">Tu respuesta:</span>{' '}
                    <span className={detail.isCorrect ? 'rc-your-answer-correct' : 'rc-your-answer-incorrect'}>
                      {detail.selectedOptionText}
                    </span>
                  </p>
                  {!detail.isCorrect && (
                    <p>
                      <span className="rc-answer-label">Respuesta correcta:</span>{' '}
                      <span className="rc-correct-answer">{detail.correctOptionText}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="rc-results-actions">
            <Link to="/estudiante/grades" className="rc-btn-primary">Ver mis calificaciones</Link>
            <Link to={`/course/${course?.id_curso || ''}`} className="rc-btn-secondary">Volver al curso</Link>
          </div>
        </div>

        <style>{`
          .rc-container { padding: 24px; max-width: 900px; margin: 0 auto; }
          .rc-results-header h1 { font-size: 24px; color: var(--text-primary); margin: 0 0 4px 0; font-family: 'Outfit', sans-serif; }
          .rc-results-header h2 { font-size: 18px; color: var(--text-secondary); margin: 0 0 24px 0; font-weight: 400; font-family: 'Outfit', sans-serif; }
          .rc-score-card { background: var(--bg-elevated); border-radius: 16px; border: 1px solid var(--border-default); padding: 32px; display: flex; align-items: center; gap: 32px; margin-bottom: 24px; box-shadow: var(--shadow-outset-sm); }
          .rc-score-circle { width: 120px; height: 120px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
          .rc-score-pass { background: var(--success-subtle); border: 3px solid var(--success); }
          .rc-score-fail { background: var(--danger-subtle); border: 3px solid var(--danger); }
          .rc-score-number { font-size: 32px; font-weight: 700; }
          .rc-score-pass .rc-score-number { color: var(--success); }
          .rc-score-fail .rc-score-number { color: var(--danger); }
          .rc-score-label { font-size: 14px; color: var(--text-secondary); }
          .rc-score-summary p { margin: 0 0 4px 0; font-size: 16px; }
          .rc-correct { font-weight: 700; }
          .rc-score-pass .rc-correct { color: var(--success); }
          .rc-score-fail .rc-correct { color: var(--danger); }
          .rc-status-pass { font-weight: 600; color: var(--success); font-size: 18px !important; }
          .rc-status-fail { font-weight: 600; color: var(--danger); font-size: 18px !important; }
          .rc-results-detail h3 { font-size: 18px; color: var(--text-primary); margin: 0 0 16px 0; font-family: 'Outfit', sans-serif; }
          .rc-question-result { background: var(--bg-elevated); border-radius: 10px; border: 1px solid var(--border-default); padding: 16px; margin-bottom: 12px; }
          .rc-result-correct { border-left: 4px solid var(--success); }
          .rc-result-incorrect { border-left: 4px solid var(--danger); }
          .rc-question-result-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
          .rc-question-number { font-size: 13px; color: var(--text-secondary); font-weight: 600; }
          .rc-result-badge { font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 600; }
          .rc-badge-correct { background: var(--success-subtle); color: var(--success); }
          .rc-badge-incorrect { background: var(--danger-subtle); color: var(--danger); }
          .rc-question-text { font-size: 14px; color: var(--text-primary); margin: 0 0 8px 0; font-weight: 500; }
          .rc-answer-detail p { margin: 4px 0; font-size: 13px; }
          .rc-answer-label { font-weight: 600; color: var(--text-secondary); }
          .rc-your-answer-correct { color: var(--success); font-weight: 600; }
          .rc-your-answer-incorrect { color: var(--danger); font-weight: 600; text-decoration: line-through; }
          .rc-correct-answer { color: var(--success); font-weight: 600; }
          .rc-results-actions { display: flex; gap: 12px; margin-top: 24px; }
          .rc-btn-primary { background: var(--accent); color: var(--bg-elevated); border: none; padding: 12px 24px; border-radius: 10px; font-size: 14px; cursor: pointer; font-weight: 500; text-decoration: none; text-align: center; }
          .rc-btn-primary:hover { background: var(--accent); filter: brightness(0.9); }
          .rc-btn-secondary { background: var(--bg-subtle); color: var(--text-primary); border: 1px solid var(--border-default); padding: 12px 24px; border-radius: 10px; font-size: 14px; cursor: pointer; font-weight: 500; text-decoration: none; text-align: center; }
          .rc-btn-secondary:hover { background: var(--border-default); }
        `}</style>
      </div>
    );
  }

  if (alreadyAnswered) {
    return (
      <div className="rc-container">
        <div className="rc-already-answered">
          <h2>Ya respondiste este cuestionario</h2>
          <p>Solo puedes responder este cuestionario una vez.</p>
          <Link to={`/course/${course?.id_curso || ''}`} className="rc-btn-back">Volver al curso</Link>
        </div>
        <style>{`
          .rc-container { padding: 24px; max-width: 800px; margin: 0 auto; }
          .rc-already-answered { text-align: center; padding: 60px 20px; background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-default); }
          .rc-already-answered h2 { color: var(--text-primary); margin: 0 0 8px 0; font-family: 'Outfit', sans-serif; }
          .rc-already-answered p { color: var(--text-secondary); margin: 0 0 20px 0; }
          .rc-btn-back { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 500; }
          .rc-btn-back:hover { text-decoration: underline; }
        `}</style>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="rc-container">
        <div className="rc-empty">
          <h2>Este cuestionario no tiene preguntas</h2>
          <Link to={`/course/${course?.id_curso || ''}`} className="rc-btn-back">Volver al curso</Link>
        </div>
        <style>{`
          .rc-container { padding: 24px; max-width: 800px; margin: 0 auto; }
          .rc-empty { text-align: center; padding: 60px 20px; background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-default); }
          .rc-empty h2 { color: var(--text-primary); margin: 0 0 20px 0; font-family: 'Outfit', sans-serif; }
          .rc-btn-back { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 500; }
          .rc-btn-back:hover { text-decoration: underline; }
        `}</style>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isFirstQuestion = currentIndex === 0;
  const isLastQuestion = currentIndex === questions.length - 1;
  const allAnswered = questions.every((q) => {
    if (q.tipo === 'verdadero_falso') return answers[q.id_pregunta] !== undefined;
    return answers[q.id_pregunta] !== undefined;
  });

  return (
    <div className="rc-container">
      <Link to={`/course/${course?.id_curso || ''}`} className="rc-btn-back-link">&larr; Volver al curso</Link>

      <div className="rc-header-content">
        <h1>{quiz.titulo_cuestionario}</h1>
        {unit && <p className="rc-unit-info">Unidad {unit.orden}: {unit.nombre_unidad}</p>}
        {course && <p className="rc-course-info">{course.nombre_curso}</p>}
      </div>

      <div className="rc-progress-bar">
        <div className="rc-progress-fill" style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}></div>
      </div>
      <div className="rc-progress-text">
        Pregunta {currentIndex + 1} de {questions.length}
      </div>

      <div className="rc-question-card">
        <h2 className="rc-question-title">
          {currentQuestion.texto_pregunta}
          {currentQuestion.tipo === 'verdadero_falso' && (
            <span className="rc-question-type-badge rc-badge-vf">Verdadero / Falso</span>
          )}
        </h2>

        {currentQuestion.tipo === 'verdadero_falso' ? (
          <div className="rc-options">
            {[
              { id: 'vf_true', texto: 'Verdadero', icon: '✅' },
              { id: 'vf_false', texto: 'Falso', icon: '❌' },
            ].map(opt => (
              <label
                key={opt.id}
                className={`rc-option rc-vf-option ${answers[currentQuestion.id_pregunta] === opt.id ? 'rc-option-selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id_pregunta}`}
                  value={opt.id}
                  checked={answers[currentQuestion.id_pregunta] === opt.id}
                  onChange={() => handleSelectOption(currentQuestion.id_pregunta, opt.id)}
                  className="rc-radio-input"
                />
                <span className="rc-vf-icon">{opt.icon}</span>
                <span className="rc-option-text">{opt.texto}</span>
              </label>
            ))}
          </div>
        ) : (
          <div className="rc-options">
            {currentQuestion.opciones.map((option) => (
              <label
                key={option.id_opcion}
                className={`rc-option ${answers[currentQuestion.id_pregunta] === option.id_opcion ? 'rc-option-selected' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${currentQuestion.id_pregunta}`}
                  value={option.id_opcion}
                  checked={answers[currentQuestion.id_pregunta] === option.id_opcion}
                  onChange={() => handleSelectOption(currentQuestion.id_pregunta, option.id_opcion)}
                  className="rc-radio-input"
                />
                <span className="rc-option-text">{option.texto_opcion}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="rc-navigation">
        <button className="rc-btn-nav" onClick={handlePrev} disabled={isFirstQuestion}>&larr; Anterior</button>
        {isLastQuestion ? (
          <button className="rc-btn-submit" onClick={handleSubmit} disabled={submitting || !allAnswered}>
            {submitting ? 'Enviando...' : 'Finalizar'}
          </button>
        ) : (
          <button className="rc-btn-nav" onClick={handleNext}>Siguiente &rarr;</button>
        )}
      </div>

      {!allAnswered && isLastQuestion && (
        <p className="rc-warning">Debes responder todas las preguntas antes de finalizar.</p>
      )}

      <div className="rc-question-dots">
        {questions.map((q, idx) => {
          const isAnswered = answers[q.id_pregunta] !== undefined;
          return (
            <button
              key={q.id_pregunta}
              className={`rc-dot ${idx === currentIndex ? 'rc-dot-active' : ''} ${isAnswered ? 'rc-dot-answered' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              title={`Pregunta ${idx + 1}`}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      <style>{`
        .rc-container { padding: 24px; max-width: 800px; margin: 0 auto; }
        .rc-loading { display: flex; justify-content: center; align-items: center; min-height: 400px; font-size: 18px; color: var(--text-secondary); }
        .rc-not-found, .rc-already-answered, .rc-empty { text-align: center; padding: 60px 20px; }
        .rc-not-found h2, .rc-already-answered h2, .rc-empty h2 { color: var(--text-primary); margin-bottom: 16px; font-family: 'Outfit', sans-serif; }
        .rc-error { background: var(--danger-subtle); color: var(--danger); padding: 12px 16px; border-radius: 10px; margin-bottom: 16px; }
        .rc-btn-back-link { color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 500; display: inline-block; margin-bottom: 12px; }
        .rc-btn-back-link:hover { text-decoration: underline; }
        .rc-header-content h1 { font-size: 28px; color: var(--text-primary); margin: 0 0 4px 0; font-family: 'Outfit', sans-serif; }
        .rc-unit-info { color: var(--text-secondary); margin: 0 0 4px 0; font-size: 14px; }
        .rc-course-info { color: var(--accent); margin: 0 0 20px 0; font-size: 14px; font-weight: 500; }
        .rc-progress-bar { width: 100%; height: 8px; background: var(--border-default); border-radius: 4px; margin-bottom: 8px; overflow: hidden; }
        .rc-progress-fill { height: 100%; background: var(--accent); border-radius: 4px; transition: width 0.3s; }
        .rc-progress-text { font-size: 13px; color: var(--text-secondary); margin-bottom: 20px; }
        .rc-question-card { background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border-default); padding: 24px; margin-bottom: 20px; box-shadow: var(--shadow-outset-sm); }
        .rc-question-title { font-size: 18px; color: var(--text-primary); margin: 0 0 20px 0; line-height: 1.4; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; font-family: 'Outfit', sans-serif; }
        .rc-question-type-badge { font-size: 11px; padding: 3px 10px; border-radius: 12px; font-weight: 600; }
        .rc-badge-vf { background: var(--info-subtle); color: var(--info); }
        .rc-options { display: flex; flex-direction: column; gap: 10px; }
        .rc-option { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 2px solid var(--border-default); border-radius: 10px; cursor: pointer; transition: all 0.2s; }
        .rc-option:hover { border-color: var(--accent-medium); background: var(--accent-subtle); }
        .rc-option-selected { border-color: var(--accent); background: var(--accent-subtle); }
        .rc-radio-input { width: 18px; height: 18px; accent-color: var(--accent); flex-shrink: 0; }
        .rc-option-text { font-size: 14px; color: var(--text-primary); }
        .rc-vf-option { flex-direction: row; padding: 16px 20px; font-size: 16px; }
        .rc-vf-icon { font-size: 24px; margin-right: 8px; }
        .rc-navigation { display: flex; justify-content: space-between; margin-bottom: 16px; }
        .rc-btn-nav { background: var(--bg-subtle); color: var(--text-primary); border: 1px solid var(--border-default); padding: 10px 20px; border-radius: 10px; font-size: 14px; cursor: pointer; font-weight: 500; }
        .rc-btn-nav:hover:not(:disabled) { background: var(--border-default); }
        .rc-btn-nav:disabled { opacity: 0.5; cursor: not-allowed; }
        .rc-btn-submit { background: var(--success); color: var(--bg-elevated); border: none; padding: 12px 32px; border-radius: 10px; font-size: 15px; cursor: pointer; font-weight: 600; }
        .rc-btn-submit:hover:not(:disabled) { background: var(--success); filter: brightness(0.9); }
        .rc-btn-submit:disabled { background: var(--success-subtle); cursor: not-allowed; }
        .rc-warning { color: var(--warning); font-size: 13px; text-align: center; margin-bottom: 16px; }
        .rc-question-dots { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; }
        .rc-dot { width: 36px; height: 36px; border-radius: 50%; border: 2px solid var(--border-default); background: var(--bg-elevated); font-size: 13px; font-weight: 500; color: var(--text-secondary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .rc-dot:hover { border-color: var(--accent); color: var(--accent); }
        .rc-dot-active { border-color: var(--accent); background: var(--accent); color: var(--bg-elevated); }
        .rc-dot-answered { border-color: var(--success); color: var(--success); }
        .rc-dot-answered.rc-dot-active { background: var(--success); color: var(--bg-elevated); }
        @media (max-width: 768px) {
          .rc-container { padding: 16px; }
          .rc-header-content h1 { font-size: 22px; }
          .rc-question-card { padding: 16px; }
          .rc-question-title { font-size: 16px; }
        }
      `}</style>
    </div>
  );
};

export default ResponderCuestionario;
