// ============================================================
// SKNOMINA - Frontend web
// App.jsx - Componente Principal
// ============================================================
import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas
const Login = lazy(() => import('./pages/Login'));
const Landing = lazy(() => import('./pages/Landing'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Planes = lazy(() => import('./pages/Planes'));
const PlanesGestion = lazy(() => import('./pages/PlanesGestion'));
const Superadmin = lazy(() => import('./pages/Superadmin'));
const PrivacidadCuenta = lazy(() => import('./pages/PrivacidadCuenta'));
const PaymentResult = lazy(() => import('./pages/PaymentResult'));
const LegalText = lazy(() => import('./pages/LegalText'));
const NotFound = lazy(() => import('./pages/NotFound'));
import CookieConsent from './components/Privacy/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
import { hasRoleAccess } from './utils/access';
const Parametrizacion = lazy(() => import('./pages/Configuracion/Parametrizacion'));
const Comunicaciones = lazy(() => import('./pages/Configuracion/Comunicaciones'));
const Auditoria = lazy(() => import('./pages/Auditoria'));
const AyudaUsuario = lazy(() => import('./pages/AyudaUsuario'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LineaBaseOperativa = lazy(() => import('./pages/Operacion/LineaBaseOperativa'));
const OperacionIntegral = lazy(() => import('./pages/Operacion/OperacionIntegral'));
const MovilizacionAprobacion = lazy(() => import('./pages/Operacion/MovilizacionAprobacion'));
const PermisosOperacion = lazy(() => import('./pages/Operacion/PermisosOperacion'));
const SaldosIniciales = lazy(() => import('./pages/Onboarding/SaldosIniciales'));
const FacturacionFiscal = lazy(() => import('./pages/Facturacion/FacturacionFiscal'));
const ListaEmpleados = lazy(() => import('./pages/Empleados/ListaEmpleados'));
const HistorialEmpleado = lazy(() => import('./pages/Empleados/HistorialEmpleado'));
const NuevoEmpleado = lazy(() => import('./pages/Empleados/NuevoEmpleado'));
const TerminarEmpleado = lazy(() => import('./pages/Empleados/TerminarEmpleado'));
const NovedadesPendientes = lazy(() => import('./pages/Asistencia/NovedadesPendientes'));
const ReporteAsistencia = lazy(() => import('./pages/Asistencia/ReporteAsistencia'));
const RutasCampo = lazy(() => import('./pages/Asistencia/RutasCampo'));
const PeriodosNomina = lazy(() => import('./pages/Nomina/PeriodosNomina'));
const CerrarMes = lazy(() => import('./pages/Nomina/CerrarMes'));
const Beneficios = lazy(() => import('./pages/Nomina/Beneficios'));
const RolesPagos = lazy(() => import('./pages/Nomina/RolesPagos'));
const DescargarReportes = lazy(() => import('./pages/Nomina/DescargarReportes'));
const PagosBancarios = lazy(() => import('./pages/Nomina/PagosBancarios'));
const ContratosGenerados = lazy(() => import('./pages/Documentos/ContratosGenerados'));
const ActasFiniquito = lazy(() => import('./pages/Documentos/ActasFiniquito'));
const ActasEntregaDotacion = lazy(() => import('./pages/Documentos/ActasEntregaDotacion'));

// Layout
const Layout = lazy(() => import('./components/Layout/Layout'));

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

function PageFallback() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">Cargando...</div>;
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
          <Suspense fallback={<PageFallback />}>
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
              <Route path="ayuda" element={
                <ProtectedRoute requiredRole={['superadmin', 'owner', 'admin_rrhh', 'supervisor', 'empleado']}>
                  <AyudaUsuario />
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
          </Suspense>
          <CookieConsent />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

