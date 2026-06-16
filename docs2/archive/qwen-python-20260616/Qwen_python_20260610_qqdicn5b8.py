# Crear frontend web (React + Vite)
app_jsx = '''// ============================================================
// PLAN HAIKY - Frontend Web (React)
// App.jsx - Componente Principal
// ============================================================
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';

// Páginas
import Login from './pages/Login';
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
            <Route path="/login" element={<Login />} />
            
            {/* Rutas protegidas */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Dashboard />} />
              
              {/* Empleados */}
              <Route path="empleados" element={
                <ProtectedRoute requiredRole={['admin_rrhh', 'supervisor']}>
                  <ListaEmpleados />
                </ProtectedRoute>
              } />
              <Route path="empleados/nuevo" element={
                <ProtectedRoute requiredRole={['admin_rrhh']}>
                  <NuevoEmpleado />
                </ProtectedRoute>
              } />
              <Route path="empleados/:id/terminar" element={
                <ProtectedRoute requiredRole={['admin_rrhh']}>
                  <TerminarEmpleado />
                </ProtectedRoute>
              } />
              
              {/* Asistencia */}
              <Route path="asistencia/novedades" element={
                <ProtectedRoute requiredRole={['admin_rrhh', 'supervisor']}>
                  <NovedadesPendientes />
                </ProtectedRoute>
              } />
              <Route path="asistencia/reporte" element={
                <ProtectedRoute requiredRole={['admin_rrhh', 'supervisor']}>
                  <ReporteAsistencia />
                </ProtectedRoute>
              } />
              
              {/* Nómina */}
              <Route path="nomina/cerrar" element={
                <ProtectedRoute requiredRole={['admin_rrhh']}>
                  <CerrarMes />
                </ProtectedRoute>
              } />
              <Route path="nomina/roles" element={
                <ProtectedRoute requiredRole={['admin_rrhh']}>
                  <RolesPagos />
                </ProtectedRoute>
              } />
              <Route path="nomina/reportes" element={
                <ProtectedRoute requiredRole={['admin_rrhh']}>
                  <DescargarReportes />
                </ProtectedRoute>
              } />
              
              {/* Documentos */}
              <Route path="documentos/contratos" element={
                <ProtectedRoute requiredRole={['admin_rrhh']}>
                  <ContratosGenerados />
                </ProtectedRoute>
              } />
              <Route path="documentos/finiquitos" element={
                <ProtectedRoute requiredRole={['admin_rrhh']}>
                  <ActasFiniquito />
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
'''

with open('frontend-web/src/App.jsx', 'w') as f:
    f.write(app_jsx)

# Crear package.json del frontend
frontend_package = '''{
  "name": "plan-haiky-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.1",
    "@tanstack/react-query": "^5.13.4",
    "axios": "^1.6.2",
    "date-fns": "^3.0.6",
    "recharts": "^2.10.3",
    "react-hook-form": "^7.49.2",
    "react-toastify": "^9.1.3",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "tailwindcss": "^3.3.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32"
  }
}
'''

with open('frontend-web/package.json', 'w') as f:
    f.write(frontend_package)

print("✓ Frontend web creado (App.jsx y package.json)")
 # Result 
✓ Frontend web creado (App.jsx y package.json)
