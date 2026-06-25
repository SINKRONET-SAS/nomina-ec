import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, FileText, Plus, Trash2 } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { formatDateEC } from '../../utils/dateFormat';

const emptyItem = {
  categoria: 'ropa_trabajo',
  descripcion: '',
  cantidad: 1,
  codigo: '',
  serial: '',
  talla: '',
  estado: 'entregado',
  observaciones: '',
};

const categoryOptions = [
  { value: 'ropa_trabajo', label: 'Ropa de trabajo' },
  { value: 'epp', label: 'EPP' },
  { value: 'equipo', label: 'Equipo' },
  { value: 'herramienta', label: 'Herramienta' },
  { value: 'otro', label: 'Otro' },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function employeeLabel(employee) {
  return `${employee.nombres || ''} ${employee.apellidos || ''}`.trim() || employee.cedula || employee.id;
}

function ActasEntregaDotacion() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    empleadoId: '',
    fechaEntrega: todayIso(),
    entregadoPor: '',
    observaciones: '',
    items: [{ ...emptyItem }],
  });
  const [descargandoId, setDescargandoId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const employeesQuery = useQuery({
    queryKey: ['empleados-acta-dotacion'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data.empleados || [];
    },
  });

  const documentsQuery = useQuery({
    queryKey: ['actas-entrega-dotacion'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos?tipo=acta_entrega_dotacion');
      return response.data.documentos || [];
    },
  });

  const selectedEmployee = useMemo(
    () => (employeesQuery.data || []).find((employee) => employee.id === form.empleadoId),
    [employeesQuery.data, form.empleadoId],
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        empleadoId: form.empleadoId,
        fechaEntrega: form.fechaEntrega,
        entregadoPor: form.entregadoPor,
        observaciones: form.observaciones,
        items: form.items,
      };
      const response = await authenticatedApi.post('/documentos/acta-entrega-dotacion', payload);
      return response.data;
    },
    onSuccess: () => {
      setMessage('Acta de entrega generada y registrada en documentos legales.');
      setError('');
      setForm((current) => ({
        ...current,
        observaciones: '',
        items: [{ ...emptyItem }],
      }));
      queryClient.invalidateQueries({ queryKey: ['actas-entrega-dotacion'] });
    },
    onError: (err) => {
      setMessage('');
      setError(extractApiError(err, 'No se pudo generar el acta de entrega.'));
    },
  });

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateItem = (index, name, value) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (
        itemIndex === index ? { ...item, [name]: value } : item
      )),
    }));
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { ...emptyItem }],
    }));
  };

  const removeItem = (index) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1
        ? current.items
        : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const descargar = async (id) => {
    setDescargandoId(id);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/documentos/${id}/download`);
      downloadUrl(response.data.url, response.data.fileName || `acta-entrega-dotacion-${id}.pdf`);
      setMessage('Acta lista para descarga.');
    } catch (err) {
      setError(extractApiError(err, 'No pudimos preparar la descarga del acta.'));
    } finally {
      setDescargandoId('');
    }
  };

  const submit = (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    generateMutation.mutate();
  };

  const documentos = documentsQuery.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Entrega de dotacion y equipos</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Genera el acta desde el sistema y deja el pendiente conectado con finiquitos hasta que los bienes retornables se marquen como devueltos.
        </p>
      </div>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-slate-950">Nueva acta</h2>
        </div>

        <form className="mt-5 space-y-5" onSubmit={submit}>
          <div className="grid gap-4 lg:grid-cols-3">
            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Empleado</span>
              <select
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateField('empleadoId', event.target.value)}
                required
                value={form.empleadoId}
              >
                <option value="">{employeesQuery.isLoading ? 'Cargando empleados' : 'Selecciona un empleado'}</option>
                {(employeesQuery.data || []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employeeLabel(employee)} - {employee.cedula}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Fecha de entrega</span>
              <input
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateField('fechaEntrega', event.target.value)}
                required
                type="date"
                value={form.fechaEntrega}
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-slate-800">Entregado por</span>
              <input
                className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
                onChange={(event) => updateField('entregadoPor', event.target.value)}
                placeholder="Responsable de RRHH"
                value={form.entregadoPor}
              />
            </label>
          </div>

          {selectedEmployee && (
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {employeeLabel(selectedEmployee)} - {selectedEmployee.cargo || 'cargo no registrado'} - {selectedEmployee.cedula}
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-semibold text-slate-950">Items entregados</h3>
              <button
                className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-teal-200 px-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                onClick={addItem}
                type="button"
              >
                <Plus className="h-4 w-4" />
                Agregar item
              </button>
            </div>

            {form.items.map((item, index) => (
              <div className="rounded-md border border-slate-200 p-4" key={`item-${index}`}>
                <div className="grid gap-3 xl:grid-cols-[150px_minmax(0,1fr)_90px_130px_130px_90px_120px_40px]">
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Tipo</span>
                    <select
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
                      onChange={(event) => updateItem(index, 'categoria', event.target.value)}
                      value={item.categoria}
                    >
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Descripcion</span>
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      onChange={(event) => updateItem(index, 'descripcion', event.target.value)}
                      placeholder="Camisa manga larga, casco, laptop..."
                      required
                      value={item.descripcion}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Cantidad</span>
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      min="1"
                      onChange={(event) => updateItem(index, 'cantidad', Number(event.target.value))}
                      required
                      type="number"
                      value={item.cantidad}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Codigo</span>
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      onChange={(event) => updateItem(index, 'codigo', event.target.value)}
                      value={item.codigo}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Serial</span>
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      onChange={(event) => updateItem(index, 'serial', event.target.value)}
                      value={item.serial}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Talla</span>
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      onChange={(event) => updateItem(index, 'talla', event.target.value)}
                      value={item.talla}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-slate-600">Estado</span>
                    <input
                      className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                      onChange={(event) => updateItem(index, 'estado', event.target.value)}
                      value={item.estado}
                    />
                  </label>
                  <button
                    className="mt-5 inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-700 disabled:opacity-40"
                    disabled={form.items.length === 1}
                    onClick={() => removeItem(index)}
                    title="Eliminar item"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-slate-600">Observaciones del item</span>
                  <input
                    className="mt-1 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                    onChange={(event) => updateItem(index, 'observaciones', event.target.value)}
                    value={item.observaciones}
                  />
                </label>
              </div>
            ))}
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Observaciones generales</span>
            <textarea
              className="mt-1 min-h-[90px] w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => updateField('observaciones', event.target.value)}
              value={form.observaciones}
            />
          </label>

          <button
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={generateMutation.isPending || !form.empleadoId}
            type="submit"
          >
            <FileText className="h-4 w-4" />
            {generateMutation.isPending ? 'Generando acta' : 'Generar acta de entrega'}
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Actas generadas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Empleado</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Cedula</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Fecha</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Items</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documentsQuery.isLoading ? (
                <tr><td className="px-5 py-4 text-center text-sm" colSpan="5">Cargando...</td></tr>
              ) : documentos.length === 0 ? (
                <tr><td className="px-5 py-4 text-center text-sm" colSpan="5">No hay actas de entrega generadas</td></tr>
              ) : documentos.map((doc) => (
                <tr className="hover:bg-slate-50" key={doc.id}>
                  <td className="px-5 py-4 text-sm">{doc.nombres} {doc.apellidos}</td>
                  <td className="px-5 py-4 text-sm">{doc.cedula}</td>
                  <td className="px-5 py-4 text-sm">{formatDateEC(doc.created_at)}</td>
                  <td className="px-5 py-4 text-sm">{doc.metadata?.items?.length || '-'}</td>
                  <td className="px-5 py-4">
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                      disabled={descargandoId === doc.id}
                      onClick={() => descargar(doc.id)}
                      title="Descargar acta"
                      type="button"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ActasEntregaDotacion;
