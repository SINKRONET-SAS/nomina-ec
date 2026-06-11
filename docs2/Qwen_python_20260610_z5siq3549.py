# Crear páginas principales del frontend
login_jsx = '''// ============================================================
// PLAN HAIKY - Página de Login
// ============================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Plan Haiky</h1>
          <p className="text-gray-600 mt-2">Sistema de RRHH Ecuador</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="tu@email.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 disabled:opacity-50 transition-colors"
          >
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2026 Plan Haiky SaaS RRHH</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
'''

with open('frontend-web/src/pages/Login.jsx', 'w') as f:
    f.write(login_jsx)

# Dashboard
dashboard_jsx = '''// ============================================================
// PLAN HAIKY - Dashboard Principal
// ============================================================
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Users, Clock, DollarSign, AlertCircle } from 'lucide-react';

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get('/api/dashboard/stats');
      return response.data;
    }
  });

  const cards = [
    { icon: Users, label: 'Empleados Activos', value: stats?.totalEmpleados || 0, color: 'blue' },
    { icon: Clock, label: 'Novedades Pendientes', value: stats?.novedadesPendientes || 0, color: 'yellow' },
    { icon: DollarSign, label: 'Nómina del Mes', value: `$${stats?.nominaMes || '0.00'}`, color: 'green' },
    { icon: AlertCircle, label: 'Marcaciones Inválidas', value: stats?.marcacionesInvalidas || 0, color: 'red' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">
                  {isLoading ? '...' : card.value}
                </p>
              </div>
              <card.icon className={`text-${card.color}-500`} size={40} />
            </div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">No hay actividad reciente</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Próximos Vencimientos</h2>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">No hay vencimientos próximos</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
'''

with open('frontend-web/src/pages/Dashboard.jsx', 'w') as f:
    f.write(dashboard_jsx)

print("✓ Páginas de Login y Dashboard creadas")
 # Result execute error ```