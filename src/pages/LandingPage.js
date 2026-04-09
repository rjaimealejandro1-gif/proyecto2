import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StackedGallery from '../components/StackedGallery';
import '../styles/LandingPage.css';

const LandingPage = () => {
  const sectionsRef = useRef([]);
  const [theme, setTheme] = useState(localStorage.getItem('lp-theme') || 'light');
  const { user, role, needsProfile, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (loading) return;

    if (user) {
      console.log(`[LANDING REDIRECT] User: ${user.email} | NeedsProfile: ${needsProfile} | Role: ${role}`);
      if (needsProfile === true) {
        navigate('/role-selection', { replace: true });
        return;
      }
      if (role) {
        const dashboardPath = {
          administrador: '/admin/dashboard',
          docente: '/docente/dashboard',
          estudiante: '/estudiante/dashboard'
        }[role];

        if (dashboardPath) {
          navigate(dashboardPath, { replace: true });
        }
        return;
      }
      
      navigate('/role-selection', { replace: true });
    }
  }, [user, role, needsProfile, loading, navigate]);

  // Theme Toggler
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('lp-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const observerOptions = { threshold: 0.05 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    sectionsRef.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const addToRefs = (el) => {
    if (el && !sectionsRef.current.includes(el)) {
      sectionsRef.current.push(el);
    }
  };

  const modules = [
    {
      title: "Módulo 1: Autenticación",
      desc: "Implementación de registro, inicio de sesión y control de roles con Supabase Auth. Garantiza que cada usuario (Admin, Docente, Alumno) acceda únicamente a sus herramientas exclusivas.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" /></svg>
    },
    {
      title: "Módulo 2: Gestión de Cursos",
      desc: "Creación y administración de oferta académica con descripciones, categorías y estados. Presentación fluida en un catálogo responsivo diseñado para una experiencia de usuario sobresaliente.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A57.43 57.43 0 0 0 12 11.75a57.43 57.43 0 0 0 5.25-.425v3.675m-10.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm10.5 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5" /></svg>
    },
    {
      title: "Módulo 3: Unidades Temáticas",
      desc: "Organización jerárquica de contenidos por bloques temáticos. Integración de materiales multimedia (videos, documentos, enlaces) reflejando la estructura de un LMS real de clase mundial.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18c-2.305 0-4.408.867-6 2.292m0-14.25v14.25" /></svg>
    },
    {
      title: "Módulo 4: Tareas Reales",
      desc: "Plataforma de asignación y entrega de actividades con subida de archivos reales. Optimiza el flujo académico con fechas límite y sistema de retroalimentación inmediato.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25h3c1.03 0 1.9.693 2.166 1.638m-10.8 0A2.25 2.25 0 0 1 5.7 1.95m13.5 1.886c.13.446.215.91.253 1.385.051.644.051 1.29 0 1.935a11.235 11.235 0 0 1-2.908 6.162m-7.442-7.85c.13.446.215.91.253 1.385.051.644.051 1.29 0 1.935a11.235 11.235 0 0 0 2.908 6.162m0 0c.21.213.447.404.708.571" /></svg>
    },
    {
      title: "Módulo 5: Evaluaciones",
      desc: "Sistema de cuestionarios objetivos con cálculo automático de resultados. Integra lógica compleja con JavaScript para una evaluación asíncrona y almacenamiento en Supabase.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" /></svg>
    },
    {
      title: "Módulo 6: Avance Académico",
      desc: "Dashboard integral de calificaciones y progreso. Permite al estudiante visualizar sus resultados, retroalimentación y avance porcentual con jerarquía visual de alto nivel.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" /></svg>
    },
    {
      title: "Módulo 7: Comunicación (Foro)",
      desc: "Espacio de interacción asíncrona por curso. Un entorno donde estudiantes y docentes debaten, resuelven dudas y comparten conocimiento de forma estructurada.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.303.025-.607.047-.912.066a3.003 3.003 0 0 0-2.825 2.825c-.019.305-.041.609-.066.912-.092 1.133-1.057 1.98-2.193 1.98H9.33c-1.136 0-2.101-.847-2.193-1.98a44.223 44.223 0 0 1-.066-.912 3.003 3.003 0 0 0-2.825-2.825" /></svg>
    },
    {
      title: "Módulo 8: Panel Multifuncional",
      desc: "Dashboard centralizado con resumen de actividades, próximas entregas y noticias académicas. Una solución integral para la organización diaria del usuario educativo.",
      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>
    }
  ];

  if (loading) {
    return (
      <div className="lp-loading-overlay">
        <div className="lp-loading-spinner"></div>
        <p>Sincronizando sesión académica...</p>
      </div>
    );
  }

  return (
    <div className="lp-container">
      {/* THEME SWITCHER UI */}
      <div className="theme-switch-wrapper">
        <span style={{ fontSize: '0.8rem', fontWeight: 600, opacity: 0.6 }}>{theme === 'light' ? 'DÍA' : 'NOCHE'}</span>
        <label className="switch">
          <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
          <span className="slider"></span>
        </label>
      </div>

      {/* 1. HERO SECTION */}
      <section className="lp-section reveal-item" ref={addToRefs}>
        <div className="lp-hero-area">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <img src="/tese.png" alt="Logo TeseEducativo05" style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid var(--lp-accent, #385144)', backgroundColor: '#fff' }} />
            <h1 className="section-title" style={{ margin: 0 }}>TeseEducativo05</h1>
          </div>
          <p style={{ marginBottom: '30px' }}>
            El desarrollo web moderno no es solo estética; es la convergencia de autenticación segura, persistencia de datos escalable y el consumo inteligente de servicios externos. Este proyecto demuestra el dominio de flujos asíncronos y arquitectura relacional.
          </p>
          
          <div className="lp-cta-group">
            <Link to="/login" className="button">
              <div className="dots_border"></div>
              <svg className="sparkle" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path className="path" d="M12 2L14.5 9.5H22L16 14.5L18.5 22L12 17.5L5.5 22L8 14.5L2 9.5H9.5L12 2Z" />
              </svg>
              <span className="text_button">Explorar proyecto</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. PROPÓSITO INTEGRAL */}
      <section className="lp-section reveal-item" ref={addToRefs}>
        <h2 className="section-title">Propósito del Proyecto</h2>
        <p style={{ marginBottom: '30px' }}>
          El propósito del proyecto es diseñar e implementar un sistema web que permita la administración de cursos, usuarios, materiales, tareas, evaluaciones y comunicación académica, diferenciando perfiles de usuario y simulando una plataforma educativa moderna.
        </p>
        <p style={{ fontStyle: 'italic', color: 'var(--lp-accent)', fontWeight: 500 }}>
          La intención es que ustedes no desarrollen únicamente páginas visuales, sino una solución integral con autenticación, persistencia de datos, consumo de servicios externos y una experiencia coherente.
        </p>
      </section>

      {/* 3. MÓDULOS OBLIGATORIOS (GLASS STACKS) */}
      <section className="lp-section reveal-item" ref={addToRefs}>
        <h2 className="section-title">Núcleos Funcionales Obligatorios</h2>
        
        <div className="glass-wrapper">
          <div className="glass-container">
            {modules.slice(0, 4).map((m, i) => {
              const rotation = [-15, -5, 5, 15][i];
              return (
                <div 
                  className="glass-card" 
                  key={i} 
                  data-text={m.title}
                  style={{ '--r': rotation }}
                >
                  {m.icon}
                  <p className="glass-desc">{m.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="glass-container">
            {modules.slice(4, 8).map((m, i) => {
              const rotation = [-15, -5, 5, 15][i];
              return (
                <div 
                  className="glass-card" 
                  key={i + 4} 
                  data-text={m.title}
                  style={{ '--r': rotation }}
                >
                  {m.icon}
                  <p className="glass-desc">{m.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. REQUISITOS TÉCNICOS */}
      <section className="lp-section reveal-item" ref={addToRefs}>
        <h2 className="section-title">INGENIERIA INFORMATICA</h2>
        <p style={{ marginBottom: '40px' }}>
          La aplicación incluye autenticación por roles vía Supabase, gestión de unidades temáticas en bloques LSS, sistemas de cuestionarios asíncronos y consumo de API externa para una experiencia educativa integral.
        </p>
        <div style={{ padding: '30px', border: '1px solid var(--lp-accent)', borderRadius: '20px', opacity: 0.8 }}>
          <p style={{ fontSize: '1rem', fontWeight: 600 }}>
            Infraestructura: React.js • Supabase Cloud • Vanilla CSS3 • HTML5 Semantic • REST APIs
          </p>
        </div>
      </section>

      {/* 5. GALERÍA INTERACTIVA */}
      <section className="lp-section reveal-item" ref={addToRefs}>
        <h2 className="section-title">Fotos</h2>
        <StackedGallery />
      </section>

      {/* 6. DISEÑO DE COLORES */}
      <section className="lp-section reveal-item" ref={addToRefs}>
        <h2 className="section-title">Identidad Visual</h2>
        <div className="palette-container">
          <div className="palette">
            <div className="color"><span>#1A2517</span></div>
            <div className="color"><span>#385144</span></div>
            <div className="color"><span>#ACC8A2</span></div>
            <div className="color"><span>#C2D8C4</span></div>
            <div className="color"><span>#F8F5F2</span></div>
          </div>
          <div id="stats">
             <span>Tokens Oficiales del Sistema Teseeducativo05</span>
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </div>
        </div>
      </section>

      {/* 7. FOOTER ACADÉMICO */}
      <footer className="lp-footer-v3 reveal-item" ref={addToRefs}>
        <div className="footer-info-grid">
          <div className="info-card">
            <h4>Estudiante</h4>
            <p>Rodriguez Lopez Jaime Alejandro</p>
          </div>
          <div className="info-card">
            <h4>Profesor</h4>
            <p>Profesor: Leonardo Miguel Moreno Villalba</p>
          </div>
          <div className="info-card">
            <h4>Materia</h4>
            <p>Desarrollo Web</p>
          </div>
          <div className="info-card">
            <h4>Semestre</h4>
            <p>6to Semestre</p>
          </div>
          <div className="info-card">
            <h4>Escuela</h4>
            <p>Tecnológico de Estudios Superiores de Ecatepec</p>
          </div>
        </div>
        <p style={{ marginTop: '60px', opacity: 0.3, fontSize: '0.8rem', color: 'white' }}>© 2026 Teseeducativo05 - Proyecto Ingeniería Informática</p>
      </footer>
    </div>
  );
};

export default LandingPage;
