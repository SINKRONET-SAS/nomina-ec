import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, FileText, Search, Settings2, Trash2 } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import CompactNotice from '../../components/UI/CompactNotice';
import { normalizeContractTemplateKey } from '../../utils/contractTemplates';
import { downloadUrl } from '../../utils/downloadUrl';
import { formatDateEC } from '../../utils/dateFormat';

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return 'Tamano no registrado';
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function signatureStatus(doc) {
  if (doc?.firmado) return 'Firmado';
  const company = doc?.metadata?.snapshot?.company || {};
  const representativeId = company.legalRepresentativeId || '';
  return representativeId && representativeId !== 'no registrada'
    ? 'Rep./trabajador'
    : 'Rep. incompleto';
}

function ContratosGenerados() {
  const queryClient = useQueryClient();
  const [descargandoId, setDescargandoId] = useState('');
  const [form, setForm] = useState({ empleadoId: '', templateKey: '' });
  const [search, setSearch] = useState('');
  const [documentFilter, setDocumentFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['contratos', search, documentFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ tipo: 'contrato,contrato_firmado', limit: '1000' });
      if (search.trim()) params.set('search', search.trim());
      if (documentFilter === 'signed') params.set('firmado', 'true');
      if (documentFilter === 'generated') params.set('firmado', 'false');
      const response = await authenticatedApi.get(`/documentos?${params.toString()}`);
      return { rows: response.data.documentos || [], total: response.data.total || 0 };
    },
  });

  const { data: empleados = [], isLoading: loadingEmployees } = useQuery({
    queryKey: ['empleados', 'contratos'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/empleados');
      return response.data.empleados || [];
    },
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['contrato-templates'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos/contrato/plantillas');
      return response.data.templates || [];
    },
  });

  const { data: orphanData, isLoading: loadingOrphans } = useQuery({
    queryKey: ['documentos-huerfanos'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos/huerfanos?limit=100');
      return response.data;
    },
  });

  const documentosRows = documentos?.rows || [];
  const orphanRows = orphanData?.documentos || [];

  const selectedEmployee = useMemo(
    () => empleados.find((empleado) => empleado.id === form.empleadoId),
    [empleados, form.empleadoId],
  );
  const employeeTemplateKey = useMemo(
    () => normalizeContractTemplateKey(selectedEmployee?.tipo_contrato, templates, ''),
    [selectedEmployee, templates],
  );
  const effectiveTemplateKey = form.templateKey || employeeTemplateKey || templates[0]?.templateKey || '';
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.templateKey === effectiveTemplateKey),
    [templates, effectiveTemplateKey],
  );

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApi.post('/documentos/contrato', {
        empleadoId: form.empleadoId,
        templateKey: selectedTemplate?.templateKey || effectiveTemplateKey,
        tipoContrato: selectedTemplate?.contractType || 'indefinido',
      });
      return response.data.documento;
    },
    onSuccess: (documento) => {
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      setMessage(`Contrato listo para revisar y firmar: ${documento?.template?.displayName || selectedTemplate?.displayName || effectiveTemplateKey}.`);
      setError('');
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No pudimos generar el contrato.'));
      setMessage('');
    },
  });

  const deleteOrphanMutation = useMutation({
    mutationFn: async (documentId) => {
      const response = await authenticatedApi.delete(`/documentos/huerfanos/${documentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-huerfanos'] });
      setMessage('Documento huerfano eliminado del almacenamiento y del registro.');
      setError('');
    },
    onError: (err) => {
      setError(getErrorMessage(err, 'No pudimos eliminar el documento huerfano.'));
      setMessage('');
    },
  });

  const descargar = async (id) => {
    setDescargandoId(id);
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/documentos/${id}/download`);
      downloadUrl(response.data.url, response.data.fileName || `contrato-${id}.pdf`);
      setMessage('Contrato listo para descarga.');
    } catch (err) {
      setError(getErrorMessage(err, 'No pudimos preparar la descarga del contrato.'));
    } finally {
      setDescargandoId('');
    }
  };

  const canGenerate = form.empleadoId && effectiveTemplateKey && !generateMutation.isPending;

  const eliminarHuerfano = (documento) => {
    if (!documento.storageKeyAvailable) {
      setError('Este documento no tiene una clave de almacenamiento trazable y requiere revision manual.');
      return;
    }
    if (!window.confirm(`¿Eliminar ${documento.fileName || 'este documento'}? Solo se muestran documentos sin empleado vinculado.`)) return;
    deleteOrphanMutation.mutate(documento.id);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Contratos</h1>
        <Link className="inline-flex min-h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:border-teal-300" to="/dashboard/configuracion/plantillas-contrato">
          <Settings2 className="h-4 w-4" /> Configurar plantillas
        </Link>
      </div>

      <CompactNotice className="mb-4" tone="amber" title="Antes de registrar">
        Revisa el contrato y, si aplica, gestiona su registro en SUT/MDT. SKNOMINA conserva la evidencia, no confirma trámites externos.
      </CompactNotice>

      <CompactNotice className="mb-4" tone="emerald" title="Firmas">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>El PDF se genera únicamente cuando los datos necesarios para firmar están completos.</span>
          <Link
            className="inline-flex min-h-9 items-center gap-2 rounded-md border border-emerald-300 bg-white px-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            to="/dashboard/configuracion/parametrizacion?seccion=empresa"
          >
            <Settings2 className="h-4 w-4" />
            Completar datos de empresa
          </Link>
        </div>
      </CompactNotice>

      <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Generar contrato</h2>
            <p className="text-sm text-slate-600">Plantillas legales versionadas</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
          <label className="block text-sm font-medium text-slate-700">
            Empleado
            <select
              className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              disabled={loadingEmployees}
              value={form.empleadoId}
              onChange={(event) => setForm((current) => ({ ...current, empleadoId: event.target.value, templateKey: '' }))}
            >
              <option value="">{loadingEmployees ? 'Cargando empleados...' : 'Selecciona empleado'}</option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.apellidos} {empleado.nombres} - {empleado.cargo || 'cargo sin registrar'}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Plantilla
            <select
              className="mt-1 h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              disabled={loadingTemplates}
              value={effectiveTemplateKey}
              onChange={(event) => setForm((current) => ({ ...current, templateKey: event.target.value }))}
            >
              <option value="">{loadingTemplates ? 'Cargando plantillas...' : 'Selecciona plantilla'}</option>
              {templates.map((template) => (
                <option key={template.templateKey} value={template.templateKey}>
                  {template.displayName} v{template.version}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => generateMutation.mutate()}
            disabled={!canGenerate}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300"
          >
            <FileText className="h-4 w-4" />
            {generateMutation.isPending ? 'Generando' : 'Generar PDF'}
          </button>
        </div>

        {selectedTemplate && (
          <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
            <span className="font-semibold text-slate-800">{selectedTemplate.displayName}</span>
            {selectedTemplate.version ? ` · Versión ${selectedTemplate.version}` : ''}
            {selectedTemplate.probation?.enabled ? ` · Período de prueba: ${selectedTemplate.probation.days} días` : ''}
            {employeeTemplateKey && !form.templateKey ? ' · Seleccionada desde la ficha del empleado' : ''}
          </div>
        )}
      </section>

      {!loadingTemplates && templates.length === 0 && (
        <CompactNotice className="mb-4" tone="red" title="No hay plantillas activas">
          Activa al menos una plantilla en configuración antes de generar nuevos contratos.
        </CompactNotice>
      )}

      {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <section className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-amber-950">Documentos sin empleado vinculado</h2>
            <p className="mt-1 text-sm leading-5 text-amber-900">
              Estos archivos pueden eliminarse para cuidar el almacenamiento. La API permite borrar unicamente documentos con empleado_id nulo y clave de almacenamiento trazable.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-900">
            {loadingOrphans ? 'Consultando...' : `${orphanRows.length} encontrados`}
          </span>
        </div>
        <div className="mt-3 max-h-64 overflow-auto rounded-md border border-amber-200 bg-white">
          {loadingOrphans ? (
            <p className="p-3 text-sm text-slate-600">Cargando documentos sin vinculo...</p>
          ) : orphanRows.length === 0 ? (
            <p className="p-3 text-sm text-slate-600">No hay documentos huerfanos disponibles para depuracion.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {orphanRows.map((documento) => (
                <li className="flex flex-wrap items-center justify-between gap-3 px-3 py-3" key={documento.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{documento.fileName}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {documento.tipo_documento || 'documento'} · {formatBytes(documento.sizeBytes)} · {formatDateEC(documento.created_at)}
                    </p>
                  </div>
                  <button
                    className="inline-flex min-h-9 items-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={!documento.storageKeyAvailable || deleteOrphanMutation.isPending}
                    onClick={() => eliminarHuerfano(documento)}
                    title={documento.storageKeyAvailable ? 'Eliminar documento huerfano' : 'Requiere clave de almacenamiento trazable'}
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="rounded-lg bg-white shadow">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <div className="flex min-w-[18rem] flex-1 items-center gap-2 rounded-md border border-slate-300 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              className="w-full border-0 p-0 text-sm outline-none"
              placeholder="Buscar empleado, cédula, plantilla o archivo"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={documentFilter} onChange={(event) => setDocumentFilter(event.target.value)}>
            <option value="all">Todos los contratos</option>
            <option value="generated">Generados pendientes</option>
            <option value="signed">Contratos firmados</option>
          </select>
          <span className="text-xs text-slate-500">{documentos?.total || 0} registros encontrados</span>
        </div>
        <div className="max-h-[34rem] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Empleado</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Plantilla</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Firmas</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">Cargando...</td></tr>
              ) : documentosRows.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">No hay contratos generados</td></tr>
              ) : (
                documentosRows.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{doc.nombres} {doc.apellidos}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        {doc.metadata?.templateDisplayName || (doc.metadata?.templateKey || doc.tipo_documento || 'contrato').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${doc.firmado || signatureStatus(doc) === 'Rep./trabajador' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {signatureStatus(doc)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDateEC(doc.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => descargar(doc.id)}
                        disabled={descargandoId === doc.id}
                        title={doc.firmado ? 'Descargar contrato firmado' : 'Descargar contrato generado'}
                        className="rounded bg-blue-100 p-1 text-blue-600 hover:bg-blue-200 disabled:opacity-50"
                      >
                        <Download size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ContratosGenerados;
