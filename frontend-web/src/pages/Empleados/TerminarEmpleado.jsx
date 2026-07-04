import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { todayISOEC } from '../../utils/dateFormat';

function TerminarEmpleado() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [causa, setCausa] = useState('');
  const [fechaSalida, setFechaSalida] = useState(todayISOEC());
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setCargando(true);
    setError('');

    try {
      const response = await authenticatedApi.post(`/empleados/${id}/terminar`, { causa, fecha_salida: fechaSalida });
      setResultado(response.data.liquidacion);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'No pudimos terminar la relacion laboral. Revisa la causa y vuelve a intentar.');
    } finally {
      setCargando(false);
    }
  };

  if (resultado) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">Liquidacion Generada</h1>
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold">Detalle de Liquidacion</h2>
          <div className="space-y-2">
            <p><strong>Empleado:</strong> {resultado.nombre}</p>
            <p><strong>Cédula:</strong> {resultado.cedula}</p>
            <p><strong>Años de servicio:</strong> {resultado.aniosServicio}</p>
            <hr className="my-4" />
            <div className="grid grid-cols-2 gap-2">
              <p>Sueldo pendiente:</p><p className="text-right">${resultado.liquidacion.sueldoPendiente}</p>
              <p>Decimo tercero:</p><p className="text-right">${resultado.liquidacion.decimoTercero}</p>
              <p>Decimo cuarto:</p><p className="text-right">${resultado.liquidacion.decimoCuarto}</p>
              <p>Vacaciones:</p><p className="text-right">${resultado.liquidacion.vacaciones}</p>
              <p>Fondo de reserva:</p><p className="text-right">${resultado.liquidacion.fondoReserva}</p>
              <p>Indemnizacion:</p><p className="text-right">${resultado.liquidacion.indemnizacion}</p>
              <p>Desahucio:</p><p className="text-right">${resultado.liquidacion.desahucio}</p>
            </div>
            <hr className="my-4" />
            <p className="text-xl font-bold">TOTAL: ${resultado.liquidacion.total}</p>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard/empleados')}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white"
            >
              Volver a Empleados
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)} className="mb-4 flex items-center text-gray-600">
        <ArrowLeft size={20} className="mr-2" /> Volver
      </button>

      <h1 className="mb-6 text-2xl font-bold">Terminar Relacion Laboral</h1>
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <div className="flex items-start">
          <AlertTriangle className="mr-3 mt-1 text-yellow-600" size={24} />
          <div>
            <h3 className="font-semibold text-yellow-800">Atencion</h3>
            <p className="mt-1 text-sm text-yellow-700">
              Esta accion generara el acta de finiquito y calculara la liquidacion automatica.
              El empleado debe haber devuelto todos los equipos asignados.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-white p-6 shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Causa de terminacion *</label>
            <select
              value={causa}
              onChange={(event) => setCausa(event.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              required
            >
              <option value="">Seleccionar...</option>
              <option value="renuncia_voluntaria">Renuncia voluntaria</option>
              <option value="despido_intempestivo">Despido intempestivo</option>
              <option value="desahucio">Desahucio (Art. 186)</option>
              <option value="mutuo_acuerdo">Mutuo acuerdo</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Fecha de salida *</label>
            <input
              type="date"
              value={fechaSalida}
              onChange={(event) => setFechaSalida(event.target.value)}
              className="w-full rounded-lg border px-3 py-2"
              required
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border px-4 py-2 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando || !causa}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cargando ? 'Procesando...' : 'Generar Liquidacion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TerminarEmpleado;
