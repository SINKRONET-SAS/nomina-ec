// ============================================================
// Nómina-Ec - Frontend web
// App.jsx - Componente Principal
// ============================================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas
import Login from './pages/Login';
import Landing from './pages/Landing';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Planes from './pages/Planes';
import PaymentResult from './pages/PaymentResult';
import LegalText from './pages/LegalText';
import Parametrizacion from './pages/Configuracion/Parametrizacion';
import Dashboard from './pages/Dashboard';
import ListaEmpleados from './pages/Empleados/ListaEmpleados';
import NuevoEmpleado from './pages/Empleados/NuevoEmpleado';
import TerminarEmpleado from './pages/Empleados/TerminarEmpleado';
import NovedadesPendientes from './pages/Asistencia/NovedadesPendientes';
import ReporteAsistencia from './pages/Asistencia/ReporteAsistencia';
import CerrarMes from './pages/Nomina/CerrarMes';
import RolesPagos from './pages/Nomina/RolesPagos';
import DescargarReportes from './pages/Nomina/DescargarReportes';
import ContratosGenerados from './pages/Documentos/ContratosGenerados';
import ActasFiniquito from './pages/Documentos/ActasFiniquito';

// Layout
import Layout from './components/Layout/Layout';

const queryClient = new QueryClient();

// Componente de ruta protegida
function ProtectedRoute({ children, requiredRole }) {
  const { usuario, cargando } = useAuth();
  
  if (cargando) {
    return <div className="flex items-center justify-center h-screen">Cargando...</div>;
  }
  
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && !requiredRole.includes(usuario.rol)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/recuperar-password" element={<ForgotPassword />} />
            <Route path="/precios" element={<Planes />} />
            <Route path="/pago/resultado" element={<PaymentResult />} />
            <Route path="/privacidad" element={<LegalText type="privacy" />} />
            <Route path="/terminos" element={<LegalText type="terms" />} />
            
            {/* Rutas protegidas */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              
              {/* Empleados */}
              <Route path="empleados" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh', 'supervisor']}>
                  <ListaEmpleados />
                </ProtectedRoute>
              } />
              <Route path="empleados/nuevo" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <NuevoEmpleado />
                </ProtectedRoute>
              } />
              <Route path="empleados/:id/terminar" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <TerminarEmpleado />
                </ProtectedRoute>
              } />
              
              {/* Asistencia */}
              <Route path="asistencia/novedades" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh', 'supervisor']}>
                  <NovedadesPendientes />
                </ProtectedRoute>
              } />
              <Route path="asistencia/reporte" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh', 'supervisor']}>
                  <ReporteAsistencia />
                </ProtectedRoute>
              } />
              
              {/* Nómina */}
              <Route path="nomina/cerrar" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <CerrarMes />
                </ProtectedRoute>
              } />
              <Route path="nomina/roles" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <RolesPagos />
                </ProtectedRoute>
              } />
              <Route path="nomina/reportes" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <DescargarReportes />
                </ProtectedRoute>
              } />
              
              {/* Documentos */}
              <Route path="documentos/contratos" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <ContratosGenerados />
                </ProtectedRoute>
              } />
              <Route path="documentos/finiquitos" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <ActasFiniquito />
                </ProtectedRoute>
              } />
              <Route path="configuracion/parametrizacion" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner', 'admin_rrhh']}>
                  <Parametrizacion />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

