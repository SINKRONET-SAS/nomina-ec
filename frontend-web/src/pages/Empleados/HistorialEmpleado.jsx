import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Upload } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { formatDateEC } from '../../utils/dateFormat';
import { downloadUrl } from '../../utils/downloadUrl';
import { fileToBase64 } from '../../utils/fileToBase64';
import { money } from '../../utils/money';

const DOCUMENT_TYPES = [
  { value: 'contrato_firmado', label: 'Contrato firmado' },
  { value: 'aviso_entrada_iess', label: 'Aviso de entrada IESS' },
  { value: 'acta_entrega_dotacion_firmada', label: 'Acta de entrega de dotacion firmada' },
  { value: 'otro_documento_laboral', label: 'Otro documento laboral' },
];

function documentLabel(documento) {
  return documento.metadata?.displayName
    || String(documento.tipo_documento || 'documento').replace(/_/g, ' ');
}

function getErrorMessage(err, fallback) {
  return err.response?.data?.message || err.response?.data?.error || err.message || fallback;
}

function HistorialEmpleado() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [tipoDocumento, setTipoDocumento] = useState('contrato_firmado');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [downloadingId, setDownloadingId] = useState('');
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['empleado-historial', id],
    queryFn: async () => {
      const [employeeResponse, historyResponse] = await Promise.all([
        authenticatedApi.get(`/empleados/${id}`),
        authenticatedApi.get(`/empleados/${id}/historial`),
      ]);
      return {
        empleado: employeeResponse.data.empleado,
        history: historyResponse.data.history,
      };
    },
  });

  const empleado = data?.empleado;
  const history = data?.history || { roles: [], novedades: [], permisos: [], documentos: [], resumen: {} };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) {
        throw new Error('Selecciona un PDF para adjuntar a la ficha laboral.');
      }
      if (selectedFile.type !== 'application/pdf') {
        throw new Error('Solo se permiten documentos PDF.');
      }

      const contenidoBase64 = await fileToBase64(selectedFile);
      const response = await authenticatedApi.post('/documentos/adjuntar', {
        empleadoId: id,
        tipoDocumento,
        nombreArchivo: selectedFile.name,
        mimeType: selectedFile.type,
        contenidoBase64,
      });
      return response.data.documento;
    },
    onSuccess: () => {
      setMessage('Documento adjuntado a la ficha laboral.');
      setUploadError('');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['empleado-historial', id] });
    },
    onError: (err) => {
      setUploadError(getErrorMessage(err, 'No pudimos adjuntar el documento laboral.'));
      setMessage('');
    },
  });

  const descargarDocumento = async (documento) => {
    setDownloadingId(documento.id);
    setUploadError('');
    try {
      const response = await authenticatedApi.get(`/documentos/${documento.id}/download`);
      downloadUrl(response.data.url, response.data.fileName || `${documento.tipo_documento || 'documento'}.pdf`);
    } catch (err) {
      setUploadError(getErrorMessage(err, 'No pudimos preparar la descarga del documento.'));
    } finally {
      setDownloadingId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700" to="/dashboard/empleados">
            <ArrowLeft className="h-4 w-4" />
            Volver a empleados
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">Historial laboral</h1>
          <p className="mt-1 text-sm text-slate-600">
            {empleado ? `${empleado.nombres} ${empleado.apellidos} - ${empleado.cedula}` : 'Ficha laboral agrupada'}
          </p>
        </div>
      </div>

      {isLoading && <div className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">Cargando historial...</div>}
      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error?.response?.data?.message || 'No pudimos cargar el historial laboral.'}
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            {[
              ['Roles', history.resumen?.roles || 0],
              ['Novedades', history.resumen?.novedades || 0],
              ['Permisos', history.resumen?.permisos || 0],
              ['Documentos', history.resumen?.documentos || 0],
            ].map(([label, value]) => (
              <div className="rounded-lg border border-slate-200 bg-white p-4" key={label}>
                <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
              </div>
            ))}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Roles de pago</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Periodo</th>
                    <th className="px-3 py-2">Ingresos</th>
                    <th className="px-3 py-2">Deducciones</th>
                    <th className="px-3 py-2">Neto</th>
                    <th className="px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.roles.length === 0 ? (
                    <tr><td className="px-3 py-3 text-slate-600" colSpan="5">Sin roles registrados.</td></tr>
                  ) : history.roles.map((rol) => (
                    <tr key={rol.id}>
                      <td className="px-3 py-2">{rol.anio}-{String(rol.mes).padStart(2, '0')}</td>
                      <td className="px-3 py-2">{money(rol.total_ingresos)}</td>
                      <td className="px-3 py-2">{money(rol.total_deducciones)}</td>
                      <td className="px-3 py-2 font-semibold">{money(rol.neto_recibir)}</td>
                      <td className="px-3 py-2">{rol.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Novedades y permisos</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {history.novedades.length === 0 ? (
                <p className="text-sm text-slate-600">Sin novedades registradas.</p>
              ) : history.novedades.map((item) => (
                <div className="rounded-md border border-slate-200 p-3" key={item.id}>
                  <p className="text-sm font-semibold text-slate-950">{String(item.tipo_novedad || '').replace(/_/g, ' ')}</p>
                  <p className="mt-1 text-xs text-slate-600">{formatDateEC(item.fecha)} - {item.estado}</p>
                  <p className="mt-2 text-sm text-slate-700">{item.justificacion || 'Sin justificacion'}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">Documentos</h2>
            <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
                <label className="text-sm font-semibold text-slate-700">
                  Tipo
                  <select
                    className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                    value={tipoDocumento}
                    onChange={(event) => setTipoDocumento(event.target.value)}
                  >
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-semibold text-slate-700">
                  PDF firmado o soporte
                  <input
                    className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                </label>
                <button
                  className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
                  disabled={uploadMutation.isPending || !selectedFile}
                  type="button"
                  onClick={() => uploadMutation.mutate()}
                >
                  <Upload className="h-4 w-4" />
                  {uploadMutation.isPending ? 'Adjuntando' : 'Adjuntar'}
                </button>
              </div>
              {message && <p className="mt-3 text-sm font-semibold text-emerald-700">{message}</p>}
              {uploadError && <p className="mt-3 text-sm font-semibold text-red-700">{uploadError}</p>}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {history.documentos.length === 0 ? (
                <p className="text-sm text-slate-600">Sin documentos asociados.</p>
              ) : history.documentos.map((documento) => (
                <button
                  className="flex items-center justify-between gap-3 rounded-md border border-slate-200 p-3 text-left text-sm font-semibold text-teal-700 hover:border-teal-300 disabled:opacity-60"
                  key={documento.id}
                  type="button"
                  disabled={downloadingId === documento.id}
                  onClick={() => descargarDocumento(documento)}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{documentLabel(documento)} - {documento.firmado ? 'Firmado' : 'Pendiente'}</span>
                  </span>
                  <Download className="h-4 w-4 shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default HistorialEmpleado;
