import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Unauthorized from './pages/Unauthorized';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import CourseManagement from './pages/admin/CourseManagement';
import DocenteDashboard from './pages/docente/DocenteDashboard';
import MyCourses from './pages/docente/MyCourses';
import CourseContentManager from './pages/docente/CourseContentManager';
import RevisionEntregas from './pages/docente/RevisionEntregas';
import DocenteCalificaciones from './pages/docente/DocenteCalificaciones';
import TeacherStats from './components/TeacherStats';
import EstudianteDashboard from './pages/estudiante/EstudianteDashboard';
import CatalogoCursos from './pages/estudiante/CatalogoCursos';
import MisCursos from './pages/estudiante/MisCursos';
import EntregaTarea from './pages/estudiante/EntregaTarea';
import ResponderCuestionario from './pages/estudiante/ResponderCuestionario';
import MisCalificaciones from './pages/estudiante/MisCalificaciones';
import InsigniasPanel from './components/InsigniasPanel';
import ActivityHistory from './components/ActivityHistory';
import CursoDetalle from './pages/CursoDetalle';
import ForoCurso from './pages/ForoCurso';
import LandingPage from './pages/LandingPage';
import RoleSelection from './pages/RoleSelection';
import './App.css';
import './styles/soft-luxe.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="/role-selection" element={<ProtectedRoute><RoleSelection /></ProtectedRoute>} />

              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <Layout>
                      <AdminDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <Layout>
                      <UserManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courses"
                element={
                  <ProtectedRoute allowedRoles={['administrador']}>
                    <Layout>
                      <CourseManagement />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/docente/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['docente']}>
                    <Layout>
                      <DocenteDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docente/my-courses"
                element={
                  <ProtectedRoute allowedRoles={['docente']}>
                    <Layout>
                      <MyCourses />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docente/course/:courseId/content"
                element={
                  <ProtectedRoute allowedRoles={['docente']}>
                    <Layout>
                      <CourseContentManager />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docente/task/:taskId/review"
                element={
                  <ProtectedRoute allowedRoles={['docente']}>
                    <Layout>
                      <RevisionEntregas />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docente/grades"
                element={
                  <ProtectedRoute allowedRoles={['docente']}>
                    <Layout>
                      <DocenteCalificaciones />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/docente/stats"
                element={
                  <ProtectedRoute allowedRoles={['docente']}>
                    <Layout>
                      <TeacherStats />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/estudiante/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <EstudianteDashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante/catalog"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <CatalogoCursos />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante/my-courses"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <MisCursos />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante/task/:taskId/submit"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <EntregaTarea />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante/quiz/:cuestionarioId"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <ResponderCuestionario />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante/grades"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <MisCalificaciones />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante/insignias"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <InsigniasPanel />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/estudiante/history"
                element={
                  <ProtectedRoute allowedRoles={['estudiante']}>
                    <Layout>
                      <ActivityHistory />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/course/:courseId"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CursoDetalle />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/course/:courseId/forum"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <ForoCurso />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </ErrorBoundary>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
