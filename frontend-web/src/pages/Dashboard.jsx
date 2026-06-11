// ============================================================
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

