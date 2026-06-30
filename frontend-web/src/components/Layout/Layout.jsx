// ============================================================
// SKNOMINA - Layout principal
// ============================================================
import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, Clock, DollarSign, FileText, CreditCard, Mail, Settings2, LogOut, Menu, ShieldCheck, X, Home, Route } from 'lucide-react';
import BrandLogo from '../Brand/BrandLogo';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Inicio', roles: ['superadmin', 'owner', 'admin_rrhh', 'supervisor', 'empleado'] },
    {
      label: 'Empleados',
      icon: Users,
      roles: ['owner', 'admin_rrhh', 'supervisor'],
      submenu: [
        { path: '/dashboard/empleados', label: 'Lista de Empleados' },
        { path: '/dashboard/empleados/nuevo', label: 'Nuevo Empleado' },
        { path: '/dashboard/onboarding/saldos-iniciales', label: 'Saldos iniciales' },
      ]
    },
    {
      label: 'Asistencia',
      icon: Clock,
      roles: ['owner', 'admin_rrhh', 'supervisor'],
      submenu: [
        { path: '/dashboard/asistencia/novedades', label: 'Ingreso manual y pendientes' },
        { path: '/dashboard/asistencia/reporte', label: 'Reporte de Asistencia' },
        { path: '/dashboard/asistencia/rutas', label: 'Rutas de campo' },
      ]
    },
    {
      label: 'Operación',
      icon: Route,
      roles: ['owner', 'admin_rrhh'],
      submenu: [
        { path: '/dashboard/operacion/permisos', label: 'Permisos' },
        { path: '/dashboard/operacion/movilizacion', label: 'Movilización' },
      ]
    },
    {
      label: 'Nómina',
      icon: DollarSign,
      roles: ['owner', 'admin_rrhh'],
      submenu: [
        { path: '/dashboard/nomina/cerrar', label: 'Cerrar Mes' },
        { path: '/dashboard/nomina/beneficios', label: 'Beneficios y descuentos' },
        { path: '/dashboard/nomina/roles', label: 'Roles de Pago' },
        { path: '/dashboard/nomina/pagos-bancarios', label: 'Pagos bancarios' },
        { path: '/dashboard/nomina/reportes', label: 'Reportes Entidades' },
      ]
    },
    {
      label: 'Documentos',
      icon: FileText,
      roles: ['owner', 'admin_rrhh'],
      submenu: [
        { path: '/dashboard/documentos/contratos', label: 'Contratos' },
        { path: '/dashboard/documentos/finiquitos', label: 'Actas de Finiquito' },
        { path: '/dashboard/documentos/dotacion', label: 'Entrega de dotacion' },
      ]
    },
    { path: '/dashboard/configuracion/parametrizacion', icon: Settings2, label: 'Parametrización', roles: ['superadmin', 'owner', 'admin_rrhh'] },
    { path: '/dashboard/configuracion/comunicaciones', icon: Mail, label: 'Comunicaciones', roles: ['superadmin', 'owner', 'admin_rrhh'] },
    { path: '/dashboard/facturacion', icon: CreditCard, label: 'Facturador interno', roles: ['superadmin'] },
    { path: '/dashboard/auditoria', icon: ShieldCheck, label: 'Auditoría', roles: ['superadmin', 'owner'] },
    { path: '/dashboard/privacidad', icon: ShieldCheck, label: 'Privacidad', roles: ['superadmin', 'owner', 'admin_rrhh', 'supervisor', 'empleado'] },
    { path: '/dashboard/superadmin', icon: CreditCard, label: 'Superadmin', roles: ['superadmin'] },
    { path: '/precios', icon: CreditCard, label: 'Planes', roles: ['superadmin', 'owner'] },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => `${location.pathname}${location.search}` === path || location.pathname === path;

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 transform flex-col bg-white shadow-lg ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-200 ease-in-out lg:translate-x-0`}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-6">
          <Link className="min-w-0" to="/dashboard" onClick={() => setSidebarOpen(false)}>
            <BrandLogo imageClassName="h-10 w-10" textClassName="text-xl font-bold text-teal-700" />
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X size={20} />
          </button>
        </div>
        
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {menuItems.map((item, idx) => {
            if (!item.roles.includes(usuario?.rol)) return null;
            
            if (item.submenu) {
              return (
                <div key={idx} className="mb-2">
                  <div className="flex items-center px-3 py-2 text-gray-700 rounded-lg">
                    <item.icon size={20} className="mr-3" />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <div className="ml-8 mt-1 space-y-1">
                    {item.submenu.map((sub, subIdx) => (
                      <Link
                        key={subIdx}
                        to={sub.path}
                        className={`block px-3 py-2 text-sm rounded-lg ${
                          isActive(sub.path) ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }
            
            return (
              <Link
                key={idx}
                to={item.path}
                className={`flex items-center px-3 py-2 mb-1 rounded-lg ${
                  isActive(item.path) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon size={20} className="mr-3" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="shrink-0 space-y-3 border-t bg-white p-4">
          <Link
            to="/"
            onClick={() => setSidebarOpen(false)}
            className="flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Home size={18} />
            Sitio publico
          </Link>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{usuario?.nombres}</p>
              <p className="text-xs text-gray-500">{usuario?.rol}</p>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-gray-600 hover:bg-red-50 hover:text-red-700"
              type="button"
            >
              <LogOut size={20} />
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu size={24} />
            </button>
            <div className="flex min-w-0 items-center gap-3">
              <span className="text-sm text-gray-600">
                {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <Link className="hidden min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:inline-flex" to="/">
                <Home size={17} />
                Sitio publico
              </Link>
              <button
                onClick={handleLogout}
                className="hidden min-h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 sm:inline-flex"
                type="button"
              >
                <LogOut size={17} />
                Salir
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto w-full max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default Layout;

