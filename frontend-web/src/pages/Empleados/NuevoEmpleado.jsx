import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authenticatedApi } from '../../services/authenticatedApi';
import { ArrowLeft } from 'lucide-react';

function NuevoEmpleado() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    cedula: '', nombres: '', apellidos: '', cargo: '',
    sueldo_bruto_mensual: '', fecha_ingreso: '', tipo_contrato: 'indefinido',
    banco: '', cuenta_bancaria: ''
  });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    
    try {
      await authenticatedApi.post('/empleados', formData);
      navigate('/empleados');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear empleado');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 mb-4">
        <ArrowLeft size={20} className="mr-2" /> Volver
      </button>
      
      <h1 className="text-2xl font-bold mb-6">Nuevo Empleado</h1>
      
      <div className="bg-white rounded-lg shadow p-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cédula *</label>
              <input type="text" name="cedula" value={formData.cedula} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" maxLength="10" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombres *</label>
              <input type="text" name="nombres" value={formData.nombres} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Apellidos *</label>
              <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cargo</label>
              <input type="text" name="cargo" value={formData.cargo} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sueldo Bruto *</label>
              <input type="number" name="sueldo_bruto_mensual" value={formData.sueldo_bruto_mensual}
                onChange={handleChange} className="w-full px-3 py-2 border rounded-lg" step="0.01" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fecha de Ingreso *</label>
              <input type="date" name="fecha_ingreso" value={formData.fecha_ingreso} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Contrato</label>
              <select name="tipo_contrato" value={formData.tipo_contrato} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="indefinido">Indefinido</option>
                <option value="ocasional">Ocasional</option>
                <option value="obra">Obra o Faena</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Banco</label>
              <select name="banco" value={formData.banco} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg">
                <option value="">Seleccionar...</option>
                <option value="PICHINCHA">Pichincha</option>
                <option value="GUAYAQUIL">Guayaquil</option>
                <option value="PRODUBANCO">Produbanco</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={() => navigate(-1)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={cargando}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {cargando ? 'Guardando...' : 'Guardar Empleado'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NuevoEmpleado;

