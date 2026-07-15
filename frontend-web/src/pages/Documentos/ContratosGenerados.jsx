import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Download, FileText, Settings2 } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import CompactNotice from '../../components/UI/CompactNotice';
import { normalizeContractTemplateKey } from '../../utils/contractTemplates';
import { downloadUrl } from '../../utils/downloadUrl';
import { formatDateEC } from '../../utils/dateFormat';

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
}

function signatureStatus(doc) {
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
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['contratos'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos?tipo=contrato');
      return response.data.documentos || [];
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

  const { data: contractTypes = [] } = useQuery({
    queryKey: ['contrato-tipos-ecuador'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos/contrato/tipos-ecuador');
      return response.data.contractTypes || [];
    },
  });

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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Contratos</h1>

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

      {contractTypes.length > 0 && (
        <section className="mb-4 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Tipos de contrato aceptados para Ecuador</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {contractTypes.map((type) => (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700" key={type.code}>
                <p className="font-semibold text-slate-950">{type.label}</p>
                <p>{type.basis}</p>
                <p className="mt-1">{type.operationalUse}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {message && <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}

      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
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
              ) : !documentos || documentos.length === 0 ? (
                <tr><td colSpan="5" className="px-6 py-4 text-center">No hay contratos generados</td></tr>
              ) : (
                documentos.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">{doc.nombres} {doc.apellidos}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                        {doc.metadata?.templateDisplayName || (doc.metadata?.templateKey || doc.tipo_documento || 'contrato').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2 py-1 text-xs ${signatureStatus(doc) === 'Rep./trabajador' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {signatureStatus(doc)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{formatDateEC(doc.created_at)}</td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => descargar(doc.id)}
                        disabled={descargandoId === doc.id}
                        title="Descargar contrato"
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
