import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, AlertTriangle } from 'lucide-react';

function TerminarEmpleado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [causa, setCausa] = useState('');
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    
    try {
      const response = await axios.post(`/api/empleados/${id}/terminar`, { causa });
      setResultado(response.data.liquidacion);
    } catch (err) {
      alert(err.response?.data?.error || 'Error al terminar empleado');
    } finally {
      setCargando(false);
    }
  };

  if (resultado) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Liquidación Generada</h1>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Detalle de Liquidación</h2>
          <div className="space-y-2">
            <p><strong>Empleado:</strong> {resultado.nombre}</p>
            <p><strong>Cédula:</strong> {resultado.cedula}</p>
            <p><strong>Años de Servicio:</strong> {resultado.aniosServicio}</p>
            <hr className="my-4" />
            <div className="grid grid-cols-2 gap-2">
              <p>Sueldo Pendiente:</p><p className="text-right">${resultado.liquidacion.sueldoPendiente}</p>
              <p>Décimo Tercero:</p><p className="text-right">${resultado.liquidacion.decimoTercero}</p>
              <p>Décimo Cuarto:</p><p className="text-right">${resultado.liquidacion.decimoCuarto}</p>
              <p>Vacaciones:</p><p className="text-right">${resultado.liquidacion.vacaciones}</p>
              <p>Indemnización:</p><p className="text-right">${resultado.liquidacion.indemnizacion}</p>
            </div>
            <hr className="my-4" />
            <p className="text-xl font-bold">TOTAL: ${resultado.liquidacion.total}</p>
          </div>
          <div className="mt-6 flex justify-end">
            <button onClick={() => navigate('/empleados')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              Volver a Empleados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 mb-4">
        <ArrowLeft size={20} className="mr-2" /> Volver
      </button>
      
      <h1 className="text-2xl font-bold mb-6">Terminar Relación Laboral</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertTriangle className="text-yellow-600 mr-3 mt-1" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-800">Atención</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Esta acción generará el acta de finiquito y calculará la liquidación automática.
              El empleado debe haber devuelto todos los equipos asignados.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Causa de Terminación *</label>
            <select value={causa} onChange={(e) => setCausa(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg" required>
              <option value="">Seleccionar...</option>
              <option value="renuncia_voluntaria">Renuncia Voluntaria</option>
              <option value="despido_intempestivo">Despido Intempestivo</option>
              <option value="desahucio">Desahucio (Art. 186)</option>
              <option value="mutuo_acuerdo">Mutuo Acuerdo</option>
            </select>
          </div>
          
          <div className="flex justify-end space-x-4 pt-4">
            <button type="button" onClick={() => navigate(-1)}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={cargando || !causa}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              {cargando ? 'Procesando...' : 'Generar Liquidación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TerminarEmpleado;

