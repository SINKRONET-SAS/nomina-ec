import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Edit,
  FileSpreadsheet,
  Plus,
  RotateCcw,
  Search,
  Upload,
  UserX,
} from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { formatDateTimeEC } from '../../utils/dateFormat';

const TEMPLATE = [
  'identification;firstName;lastName;departmentCode;position;hireDate;salary;monthlyHours;annualPersonalExpenses;bankCode;bankAccount;accountType;contractType;email;phone',
  '1710034065;Maria Fernanda;Demo Ruiz;ADM;Analista de Talento;2026-01-15;850.00;240;0;PICHINCHA;2200123456;AHORROS;indefinido;maria.demo@example.com;0999999999',
].join('\n');

function ImportPanel({ onImported }) {
  const [rawText, setRawText] = useState('');
  const [sourceName, setSourceName] = useState('carga_manual.csv');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);

  const batchesQuery = useQuery({
    queryKey: ['employee-import-batches'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados/importar/lotes');
      return response.data.batches || [];
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApi.post('/empleados/importar/preview', { rawText, sourceName });
      return response.data?.preview;
    },
    onSuccess: (data) => {
      setPreview(data);
      setResult(null);
    },
  });

  const commitMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApi.post('/empleados/importar/confirmar', { rawText, sourceName });
      return response.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setPreview(data.preview);
      onImported();
      batchesQuery.refetch();
    },
  });

  const rollbackMutation = useMutation({
    mutationFn: async (batchId) => {
      const response = await authenticatedApi.delete(`/empleados/importar/lotes/${batchId}`);
      return response.data;
    },
    onSuccess: (data) => {
      setResult({ ...data, rollback: true });
      onImported();
      batchesQuery.refetch();
    },
  });

  const loadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSourceName(file.name);
    setRawText(await file.text());
    setPreview(null);
    setResult(null);
  };

  const canPreview = rawText.trim().length > 0 && !previewMutation.isPending;
  const canConfirm = preview?.validRows > 0 && preview?.errorRows === 0 && !commitMutation.isPending;
  const previewRows = preview?.rows || [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">Carga masiva de empleados</h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Importa empleados con prevalidacion, errores por fila y lote auditable. No se aplican filas si existe algun error.
          </p>
        </div>
        <button
          className="inline-flex min-h-10 w-fit items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-slate-700"
          onClick={() => {
            setSourceName('plantilla_empleados_demo.csv');
            setRawText(TEMPLATE);
            setPreview(null);
            setResult(null);
          }}
          type="button"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Usar plantilla
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-slate-800" htmlFor="employee-import-file">
            Archivo CSV o TSV
          </label>
          <input
            accept=".csv,.txt,.tsv"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            id="employee-import-file"
            onChange={loadFile}
            type="file"
          />

          <label className="block text-sm font-semibold text-slate-800" htmlFor="employee-import-raw">
            Contenido a validar
          </label>
          <textarea
            className="min-h-[170px] w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
            id="employee-import-raw"
            onChange={(event) => {
              setRawText(event.target.value);
              setPreview(null);
              setResult(null);
            }}
            spellCheck="false"
            value={rawText}
          />

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!canPreview}
              onClick={() => previewMutation.mutate()}
              type="button"
            >
              <Search className="h-4 w-4" />
              {previewMutation.isPending ? 'Validando' : 'Prevalidar carga'}
            </button>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!canConfirm}
              onClick={() => commitMutation.mutate()}
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              {commitMutation.isPending ? 'Importando' : 'Confirmar importacion'}
            </button>
          </div>
        </div>

        <div className="rounded-md border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">Resumen</h3>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">Filas</dt>
              <dd className="text-xl font-semibold text-slate-900">{preview?.totalRows || 0}</dd>
            </div>
            <div className="rounded-md bg-emerald-50 p-3">
              <dt className="text-xs text-emerald-700">Validas</dt>
              <dd className="text-xl font-semibold text-emerald-900">{preview?.validRows || 0}</dd>
            </div>
            <div className="rounded-md bg-red-50 p-3">
              <dt className="text-xs text-red-700">Errores</dt>
              <dd className="text-xl font-semibold text-red-900">{preview?.errorRows || 0}</dd>
            </div>
          </dl>

          {result?.batchId && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Lote {result.batchId}: {result.totalImported} empleados importados.
            </div>
          )}

          {result?.rollback && (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Lote revertido: {result.deletedEmployees} empleados retirados.
            </div>
          )}

          {(previewMutation.isError || commitMutation.isError || rollbackMutation.isError) && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-800">
              {extractApiError(previewMutation.error || commitMutation.error || rollbackMutation.error, 'No pudimos procesar la accion. Revisa el lote e intenta nuevamente.')}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 rounded-md border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Lotes recientes</h3>
        <div className="mt-3 space-y-2">
          {(batchesQuery.data || []).length === 0 ? (
            <p className="text-sm text-slate-600">Aun no hay lotes de importacion.</p>
          ) : (
            (batchesQuery.data || []).map((batch) => (
              <div className="flex flex-col gap-2 rounded-md bg-slate-50 px-3 py-2 md:flex-row md:items-center md:justify-between" key={batch.id}>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{batch.source_name}</p>
                  <p className="text-xs text-slate-600">
                    {batch.status} - {batch.employee_count} empleados activos - {formatDateTimeEC(batch.created_at)}
                  </p>
                </div>
                <button
                  className="inline-flex min-h-9 w-fit items-center gap-2 rounded-md border border-red-200 px-3 text-xs font-semibold text-red-700 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={batch.status !== 'completado' || Number(batch.employee_count || 0) === 0 || rollbackMutation.isPending}
                  onClick={() => rollbackMutation.mutate(batch.id)}
                  type="button"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Revertir
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {previewRows.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Fila</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-left">Identificacion</th>
                <th className="px-4 py-3 text-left">Empleado</th>
                <th className="px-4 py-3 text-left">Cargo</th>
                <th className="px-4 py-3 text-left">Sueldo</th>
                <th className="px-4 py-3 text-left">Errores</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.slice(0, 20).map((row) => (
                <tr className={row.status === 'error' ? 'bg-red-50/50' : 'bg-white'} key={row.rowNumber}>
                  <td className="px-4 py-3">{row.rowNumber}</td>
                  <td className="px-4 py-3">
                    {row.status === 'valid' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> valida
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
                        <AlertTriangle className="h-3.5 w-3.5" /> error
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{row.data.identification}</td>
                  <td className="px-4 py-3">{row.data.firstName} {row.data.lastName}</td>
                  <td className="px-4 py-3">{row.data.position || '-'}</td>
                  <td className="px-4 py-3">${Number(row.data.salary || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-red-700">{row.errors.join('; ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ListaEmpleados() {
  const queryClient = useQueryClient();
  const [busqueda, setBusqueda] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['empleados'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data.empleados;
    },
  });

  const empleados = data || [];
  const filtrados = useMemo(() => empleados.filter((empleado) => (
    `${empleado.nombres} ${empleado.apellidos} ${empleado.cedula}`.toLowerCase().includes(busqueda.toLowerCase())
  )), [empleados, busqueda]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Base laboral</p>
          <h1 className="text-2xl font-bold text-slate-950">Empleados</h1>
        </div>
        <Link to="/dashboard/empleados/nuevo" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white">
          <Plus size={18} /> Nuevo empleado
        </Link>
      </div>

      <ImportPanel onImported={() => queryClient.invalidateQueries({ queryKey: ['empleados'] })} />

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {extractApiError(error, 'No pudimos cargar empleados. Revisa la sesion e intenta nuevamente.')}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
            <input
              className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100"
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Buscar por nombre o cedula"
              type="text"
              value={busqueda}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Cedula</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Cargo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Sueldo</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {isLoading ? (
                <tr><td className="px-6 py-4 text-center text-sm text-slate-600" colSpan="5">Cargando empleados...</td></tr>
              ) : filtrados.length === 0 ? (
                <tr><td className="px-6 py-4 text-center text-sm text-slate-600" colSpan="5">No hay empleados para mostrar</td></tr>
              ) : (
                filtrados.map((empleado) => (
                  <tr className="hover:bg-slate-50" key={empleado.id}>
                    <td className="px-6 py-4 text-sm">{empleado.cedula}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{empleado.nombres} {empleado.apellidos}</td>
                    <td className="px-6 py-4 text-sm">{empleado.cargo || '-'}</td>
                    <td className="px-6 py-4 text-sm">${Number(empleado.sueldo_bruto_mensual || 0).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <Link className="text-teal-700 hover:text-teal-900" to={`/dashboard/empleados/${empleado.id}/editar`} title="Editar empleado">
                          <Edit size={16} />
                        </Link>
                        <Link className="text-red-600 hover:text-red-800" to={`/dashboard/empleados/${empleado.id}/terminar`}>
                          <UserX size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default ListaEmpleados;
