import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCcw, RotateCcw, Upload } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { extractApiError } from '../../services/publicApi';
import { downloadBlob } from '../../utils/downloadBlob';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text) {
  const usableLines = String(text || '')
    .replace(/^\ufeff/, '')
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), index }))
    .filter(({ line }) => line && !line.startsWith('#'));

  if (usableLines.length < 2) return [];
  const headers = splitCsvLine(usableLines[0].line).map((header) => header.trim());
  return usableLines.slice(1).map(({ line, index }) => {
    const cells = splitCsvLine(line);
    return headers.reduce((row, header, headerIndex) => ({
      ...row,
      [header]: cells[headerIndex] || '',
      rowNumber: index + 1,
    }), {});
  });
}

function buildErrorCsv(items = []) {
  const headers = ['fila', 'cedula', 'empleado', 'tipoSaldo', 'periodo', 'errores'];
  const rows = items
    .filter((item) => item.errors?.length > 0)
    .map((item) => [
      item.rowNumber,
      item.cedula,
      item.employeeName,
      item.balanceType,
      item.periodKey,
      item.errors.join(' | '),
    ]);
  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
}

function statusStyle(status) {
  const styles = {
    validated: 'bg-emerald-50 text-emerald-700',
    committed: 'bg-blue-50 text-blue-700',
    blocked: 'bg-amber-50 text-amber-800',
    reverted: 'bg-slate-100 text-slate-700',
  };
  return styles[status] || 'bg-slate-100 text-slate-700';
}

export default function SaldosIniciales() {
  const queryClient = useQueryClient();
  const [periodCut, setPeriodCut] = useState(todayIso());
  const [sourceFilename, setSourceFilename] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const batchesQuery = useQuery({
    queryKey: ['initial-balances', 'batches'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/onboarding/saldos-iniciales/lotes');
      return response.data.data || [];
    },
  });

  const detailQuery = useQuery({
    queryKey: ['initial-balances', 'batch', selectedBatch],
    queryFn: async () => {
      const response = await authenticatedApi.get(`/onboarding/saldos-iniciales/lotes/${selectedBatch}`);
      return response.data.data;
    },
    enabled: Boolean(selectedBatch),
  });

  const dryRunMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApi.post('/onboarding/saldos-iniciales/dry-run', {
        periodCut,
        rows,
        sourceFilename,
      });
      return response.data.data;
    },
    onSuccess: (batch) => {
      setSelectedBatch(batch.id);
      queryClient.invalidateQueries({ queryKey: ['initial-balances'] });
    },
  });

  const commitMutation = useMutation({
    mutationFn: async (batchId) => authenticatedApi.post(`/onboarding/saldos-iniciales/lotes/${batchId}/commit`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initial-balances'] });
    },
  });

  const revertMutation = useMutation({
    mutationFn: async (batchId) => authenticatedApi.post(`/onboarding/saldos-iniciales/lotes/${batchId}/revertir`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initial-balances'] });
    },
  });

  const selectedDetail = detailQuery.data;
  const previewStats = useMemo(() => ({
    rows: rows.length,
    employees: new Set(rows.map((row) => row.cedula).filter(Boolean)).size,
  }), [rows]);

  const handleTemplate = async (format) => {
    const response = await authenticatedApi.get(`/onboarding/saldos-iniciales/plantilla.${format}`, {
      responseType: 'blob',
    });
    downloadBlob(response.data, `plantilla_saldos_iniciales_sknomina.${format}`);
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSourceFilename(file.name);
    const text = await file.text();
    setRows(parseCsv(text));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-800">Onboarding</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Saldos iniciales</h1>
        <p className="mt-1 text-sm text-slate-600">
          Migra saldos de nuevos clientes con plantilla, prevalidación, aprobación, reversa y auditoría por lote.
        </p>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => handleTemplate('csv')}
            type="button"
          >
            <Download className="h-4 w-4" />
            Plantilla CSV
          </button>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            onClick={() => handleTemplate('xlsx')}
            type="button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Plantilla Excel
          </button>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Fecha de corte</span>
            <input
              className="min-h-11 rounded-md border border-slate-300 px-3 text-sm"
              onChange={(event) => setPeriodCut(event.target.value)}
              type="date"
              value={periodCut}
            />
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-teal-300 px-4 text-sm font-semibold text-teal-800 hover:bg-teal-50">
            <Upload className="h-4 w-4" />
            Cargar CSV
            <input accept=".csv,text/csv" className="hidden" onChange={handleFile} type="file" />
          </label>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={rows.length === 0 || dryRunMutation.isPending}
            onClick={() => dryRunMutation.mutate()}
            type="button"
          >
            <CheckCircle2 className="h-4 w-4" />
            Prevalidar lote
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Archivo</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{sourceFilename || 'Sin seleccionar'}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Filas cargadas</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{previewStats.rows}</p>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Trabajadores detectados</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{previewStats.employees}</p>
          </div>
        </div>
        {dryRunMutation.isError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {extractApiError(dryRunMutation.error, 'No pudimos prevalidar el lote.')}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Lotes recientes</h2>
            <button
              className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => batchesQuery.refetch()}
              type="button"
            >
              <RefreshCcw className="h-4 w-4" />
              Actualizar
            </button>
          </div>
          <div className="space-y-2">
            {(batchesQuery.data || []).map((batch) => (
              <button
                className={`w-full rounded-md border p-3 text-left text-sm hover:border-teal-300 ${selectedBatch === batch.id ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white'}`}
                key={batch.id}
                onClick={() => setSelectedBatch(batch.id)}
                type="button"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900">{batch.sourceFilename || batch.sourceHash?.slice(0, 10)}</span>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusStyle(batch.status)}`}>{batch.status}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{batch.totalRows} filas · {batch.errorRows} errores</p>
              </button>
            ))}
            {(batchesQuery.data || []).length === 0 && (
              <p className="rounded-md bg-slate-50 px-3 py-4 text-sm text-slate-500">Aún no hay lotes cargados.</p>
            )}
          </div>
        </section>

        <section className="rounded-md border border-slate-200 bg-white p-4">
          {!selectedDetail && (
            <div className="flex min-h-64 items-center justify-center rounded-md bg-slate-50 text-sm text-slate-500">
              Selecciona un lote o realiza una prevalidación para revisar el detalle.
            </div>
          )}

          {selectedDetail && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">Detalle del lote</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedDetail.validRows} filas válidas de {selectedDetail.totalRows}. {selectedDetail.errorRows} filas requieren corrección.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDetail.errorRows > 0 && (
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      onClick={() => downloadBlob(
                        new Blob([`\ufeff${buildErrorCsv(selectedDetail.items || [])}`], { type: 'text/csv;charset=utf-8' }),
                        `errores_saldos_iniciales_${selectedDetail.id}.csv`
                      )}
                      type="button"
                    >
                      <Download className="h-4 w-4" />
                      Descargar errores
                    </button>
                  )}
                  {selectedDetail.status === 'validated' && (
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-semibold text-white hover:bg-teal-800"
                      disabled={commitMutation.isPending}
                      onClick={() => commitMutation.mutate(selectedDetail.id)}
                      type="button"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Aplicar saldos
                    </button>
                  )}
                  {selectedDetail.status === 'committed' && (
                    <button
                      className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-300 px-3 text-sm font-semibold text-amber-800 hover:bg-amber-50"
                      disabled={revertMutation.isPending}
                      onClick={() => revertMutation.mutate(selectedDetail.id)}
                      type="button"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Revertir lote
                    </button>
                  )}
                </div>
              </div>

              {(commitMutation.isError || revertMutation.isError) && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {extractApiError(commitMutation.error || revertMutation.error, 'No pudimos completar la operación del lote.')}
                </div>
              )}

              {selectedDetail.status === 'blocked' && (
                <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Corrige las filas con error y vuelve a cargar la plantilla. Los periodos cerrados no se modifican.
                </div>
              )}

              <div className="overflow-auto rounded-md border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Fila</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Empleado</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Saldo</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Periodo</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Valor</th>
                      <th className="px-3 py-2 text-left font-semibold text-slate-600">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedDetail.items || []).map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-slate-600">{item.rowNumber}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-900">{item.employeeName || 'Sin coincidencia'}</div>
                          <div className="text-xs text-slate-500">{item.cedula}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{item.balanceLabel}</td>
                        <td className="px-3 py-2 text-slate-700">{item.periodKey}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {item.amount ? `$${item.amount.toFixed(2)}` : item.hours ? `${item.hours.toFixed(2)} h` : `${item.days.toFixed(2)} d`}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{item.status}</span>
                          {item.errors?.length > 0 && <p className="mt-1 max-w-xs text-xs text-red-700">{item.errors.join(' ')}</p>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
