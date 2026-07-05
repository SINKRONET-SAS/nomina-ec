// ============================================================
// SKNOMINA - Frontend web
// App.jsx - Componente Principal
// ============================================================
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas
import Login from './pages/Login';
import Landing from './pages/Landing';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Planes from './pages/Planes';
import PlanesGestion from './pages/PlanesGestion';
import Superadmin from './pages/Superadmin';
import PrivacidadCuenta from './pages/PrivacidadCuenta';
import PaymentResult from './pages/PaymentResult';
import LegalText from './pages/LegalText';
import NotFound from './pages/NotFound';
import CookieConsent from './components/Privacy/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
import { hasRoleAccess } from './utils/access';
import Parametrizacion from './pages/Configuracion/Parametrizacion';
import Comunicaciones from './pages/Configuracion/Comunicaciones';
import Auditoria from './pages/Auditoria';
import Dashboard from './pages/Dashboard';
import LineaBaseOperativa from './pages/Operacion/LineaBaseOperativa';
import OperacionIntegral from './pages/Operacion/OperacionIntegral';
import MovilizacionAprobacion from './pages/Operacion/MovilizacionAprobacion';
import PermisosOperacion from './pages/Operacion/PermisosOperacion';
import SaldosIniciales from './pages/Onboarding/SaldosIniciales';
import FacturacionFiscal from './pages/Facturacion/FacturacionFiscal';
import ListaEmpleados from './pages/Empleados/ListaEmpleados';
import HistorialEmpleado from './pages/Empleados/HistorialEmpleado';
import NuevoEmpleado from './pages/Empleados/NuevoEmpleado';
import TerminarEmpleado from './pages/Empleados/TerminarEmpleado';
import NovedadesPendientes from './pages/Asistencia/NovedadesPendientes';
import ReporteAsistencia from './pages/Asistencia/ReporteAsistencia';
import RutasCampo from './pages/Asistencia/RutasCampo';
import PeriodosNomina from './pages/Nomina/PeriodosNomina';
import CerrarMes from './pages/Nomina/CerrarMes';
import Beneficios from './pages/Nomina/Beneficios';
import RolesPagos from './pages/Nomina/RolesPagos';
import DescargarReportes from './pages/Nomina/DescargarReportes';
import PagosBancarios from './pages/Nomina/PagosBancarios';
import ContratosGenerados from './pages/Documentos/ContratosGenerados';
import ActasFiniquito from './pages/Documentos/ActasFiniquito';
import ActasEntregaDotacion from './pages/Documentos/ActasEntregaDotacion';

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
  
  if (requiredRole && !hasRoleAccess(usuario, requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
}

function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    const targetId = decodeURIComponent(location.hash.replace('#', ''));
    window.setTimeout(() => {
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 80);
  }, [location.pathname, location.hash]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <ScrollToHash />
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
            <Route path="/eliminar-cuenta" element={<LegalText />} />
            <Route path="/soporte" element={<LegalText />} />
            
            {/* Rutas protegidas */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="operacion/base" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner', 'admin_rrhh']}>
                  <LineaBaseOperativa />
                </ProtectedRoute>
              } />
              <Route path="operacion/integral" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner', 'admin_rrhh']}>
                  <OperacionIntegral />
                </ProtectedRoute>
              } />
              <Route path="operacion/movilizacion" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <MovilizacionAprobacion />
                </ProtectedRoute>
              } />
              <Route path="operacion/permisos" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <PermisosOperacion />
                </ProtectedRoute>
              } />
              
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
              <Route path="empleados/:id/editar" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <NuevoEmpleado />
                </ProtectedRoute>
              } />
              <Route path="empleados/:id/historial" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh', 'supervisor']}>
                  <HistorialEmpleado />
                </ProtectedRoute>
              } />
              <Route path="empleados/:id/terminar" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <TerminarEmpleado />
                </ProtectedRoute>
              } />
              <Route path="onboarding/saldos-iniciales" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <SaldosIniciales />
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
              <Route path="asistencia/rutas" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh', 'supervisor']}>
                  <RutasCampo />
                </ProtectedRoute>
              } />
              
              {/* Nómina */}
              <Route path="nomina/periodos" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <PeriodosNomina />
                </ProtectedRoute>
              } />
              <Route path="nomina/cerrar" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <CerrarMes />
                </ProtectedRoute>
              } />
              <Route path="nomina/beneficios" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <Beneficios />
                </ProtectedRoute>
              } />
              <Route path="nomina/roles" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <RolesPagos />
                </ProtectedRoute>
              } />
              <Route path="nomina/pagos-bancarios" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <PagosBancarios />
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
              <Route path="documentos/dotacion" element={
                <ProtectedRoute requiredRole={['owner', 'admin_rrhh']}>
                  <ActasEntregaDotacion />
                </ProtectedRoute>
              } />
              <Route path="configuracion/parametrizacion" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner', 'admin_rrhh']}>
                  <Parametrizacion />
                </ProtectedRoute>
              } />
              <Route path="configuracion/comunicaciones" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner', 'admin_rrhh']}>
                  <Comunicaciones />
                </ProtectedRoute>
              } />
              <Route path="auditoria" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner']}>
                  <Auditoria />
                </ProtectedRoute>
              } />
              <Route path="privacidad" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner', 'admin_rrhh', 'supervisor', 'empleado']}>
                  <PrivacidadCuenta />
                </ProtectedRoute>
              } />
              <Route path="planes" element={
                <ProtectedRoute requiredRole={['superadmin']}>
                  <PlanesGestion />
                </ProtectedRoute>
              } />
              <Route path="facturacion" element={
                <ProtectedRoute requiredRole={['superadmin']}>
                  <FacturacionFiscal />
                </ProtectedRoute>
              } />
              <Route path="superadmin" element={
                <ProtectedRoute requiredRole={['superadmin']}>
                  <Superadmin />
                </ProtectedRoute>
              } />
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieConsent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

