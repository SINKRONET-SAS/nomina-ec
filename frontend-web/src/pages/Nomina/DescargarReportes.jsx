import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileText, Landmark, ShieldCheck } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { ECUADOR_TIME_ZONE, currentPeriodEC } from '../../utils/dateFormat';

const institutionalReports = [
  {
    type: 'rdep',
    title: 'RDEP - SRI',
    entity: 'Servicio de Rentas Internas',
    description: 'Anexo anual de relación de dependencia para retenciones de impuesto a la renta de empleados.',
    button: 'Generar XML RDEP',
    accent: 'blue',
  },
  {
    type: 'form107',
    title: 'Formulario 107 - SRI',
    entity: 'Servicio de Rentas Internas',
    description: 'PDF individual anual por trabajador con resumen de ingresos y retenciones de relación de dependencia.',
    button: 'Generar PDF 107',
    accent: 'blue',
  },
  {
    type: 'sae',
    title: 'SAE - IESS',
    entity: 'Instituto Ecuatoriano de Seguridad Social',
    description: 'Avisos y aportes de empleados en relación de dependencia para el IESS.',
    button: 'Generar XML SAE',
    accent: 'green',
  },
];

const pendingRequirements = [
  'Ministerio del Trabajo: reportes laborales que dependan de la obligación aplicable al empleador.',
  'Contraloría, UAFE u otra entidad pública: formatos habilitados según actividad, tipo de empresa y periodo.',
  'Anexos SRI distintos a RDEP: se tratan como obligaciones tributarias generales, no como reportes de nómina.',
];

const accentClasses = {
  blue: {
    icon: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
  },
  green: {
    icon: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
  },
};

function DescargarReportes() {
  const initialPeriod = currentPeriodEC();
  const [anio, setAnio] = useState(initialPeriod.anio);
  const [mes, setMes] = useState(initialPeriod.mes);
  const [reportCode, setReportCode] = useState('PAYROLL_DETAIL_TABULAR');
  const [format, setFormat] = useState('xlsx');
  const [filters, setFilters] = useState({
    employeeId: '',
    department: '',
    position: '',
    costCenter: '',
  });
  const [empleados, setEmpleados] = useState([]);
  const [form107EmpleadoId, setForm107EmpleadoId] = useState('');
  const [cargando, setCargando] = useState('');
  const [rdepPrecheck, setRdepPrecheck] = useState(null);
  const [form107Precheck, setForm107Precheck] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    authenticatedApi.get('/empleados')
      .then((response) => setEmpleados(response.data.empleados || response.data.data || []))
      .catch((err) => {
        console.error('[REPORTES] No se pudieron cargar empleados para Formulario 107', {
          code: err.response?.data?.error || 'FORM107_EMPLOYEES_LOAD_ERROR',
          statusCode: err.response?.status || 500,
          correlationId: err.response?.data?.correlationId || 'frontend-form107',
          userId: null,
          message: err.message,
        });
      });
  }, []);

  const validarRdep = async () => {
    setCargando('rdep-precheck');
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.post('/reportes/rdep/precheck', { anio });
      setRdepPrecheck(response.data.precheck);
      setMessage(response.data.precheck.ready
        ? 'RDEP anual listo para generar con validación estructural activa.'
        : 'RDEP anual requiere acciones antes de generar el XML.');
      return response.data.precheck;
    } catch (err) {
      const nextError = err.response?.data?.message || err.response?.data?.error || 'No pudimos validar RDEP.';
      setError(nextError);
      setRdepPrecheck(null);
      return null;
    } finally {
      setCargando('');
    }
  };

  const validarFormulario107 = async () => {
    setCargando('form107-precheck');
    setMessage('');
    setError('');
    try {
      if (!form107EmpleadoId) {
        throw new Error('Selecciona un empleado para validar Formulario 107.');
      }
      const response = await authenticatedApi.post('/reportes/formulario-107/precheck', {
        anio,
        empleadoId: form107EmpleadoId,
      });
      setForm107Precheck(response.data.precheck);
      setMessage(response.data.precheck.ready
        ? 'Formulario 107 listo para generar en PDF.'
        : 'Formulario 107 requiere acciones antes de generarse.');
      return response.data.precheck;
    } catch (err) {
      const nextError = err.response?.data?.message || err.response?.data?.error || err.message || 'No pudimos validar Formulario 107.';
      setError(nextError);
      setForm107Precheck(null);
      return null;
    } finally {
      setCargando('');
    }
  };

  const generarReporte = async (tipo) => {
    setCargando(tipo);
    setMessage('');
    setError('');
    try {
      if (tipo === 'rdep') {
        const precheck = rdepPrecheck?.anio === anio ? rdepPrecheck : await validarRdep();
        if (!precheck?.ready) {
          setCargando('');
          return;
        }
      }
      if (tipo === 'form107') {
        const precheck = form107Precheck?.anio === anio && form107Precheck?.empleadoId === form107EmpleadoId
          ? form107Precheck
          : await validarFormulario107();
        if (!precheck?.ready) {
          setCargando('');
          return;
        }
      }
      const endpointByType = {
        rdep: '/reportes/rdep',
        form107: '/reportes/formulario-107',
        sae: '/reportes/sae',
      };
      const response = await authenticatedApi.post(endpointByType[tipo], {
        anio,
        mes: tipo === 'rdep' ? undefined : mes,
        empleadoId: tipo === 'form107' ? form107EmpleadoId : undefined,
      });
      const url = response.data.reporte?.url || response.data.reporte?.csvUrl;

      if (url) {
        downloadUrl(url, response.data.reporte?.fileName || `${tipo}-${anio}-${mes}`);
      }
      setMessage('Reporte generado exitosamente.');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al generar reporte');
    } finally {
      setCargando('');
    }
  };

  const exportarReporteNomina = async () => {
    setCargando('nomina-export');
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.post('/reportes/nomina/exportar', {
        anio,
        mes,
        reportCode,
        format,
        filters,
      });
      const url = response.data.reporte?.url;

      if (url) {
        downloadUrl(url, response.data.reporte?.fileName || `${reportCode}-${anio}-${mes}.${format}`);
      }
      setMessage(`Reporte de nómina generado: ${response.data.reporte?.totalFilas || 0} filas.`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al exportar reporte de nómina');
    } finally {
      setCargando('');
    }
  };

  const exportarConsolidadoAnual = async () => {
    setCargando('nomina-anual');
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.get(`/reportes/nomina/${anio}/consolidado`, {
        params: {
          reportCode,
          filters: JSON.stringify(filters),
        },
      });
      const url = response.data.reporte?.url;

      if (url) {
        downloadUrl(url, response.data.reporte?.fileName || `PAYROLL_ANUAL_${reportCode}_${anio}.xlsx`);
      }
      setMessage(`Consolidado anual generado: ${response.data.reporte?.totalFilas || 0} filas.`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al exportar consolidado anual de nómina');
    } finally {
      setCargando('');
    }
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reportes para entidades públicas</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Genera reportes propios de nómina para Ecuador. Para SRI se usa RDEP anual en relación de dependencia;
          ATS no se muestra aquí porque corresponde a obligaciones tributarias generales.
        </p>
      </div>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Mes</label>
            <select
              value={mes}
              onChange={(event) => setMes(parseInt(event.target.value, 10))}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>{index + 1}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Año</label>
            <input
              type="number"
              value={anio}
              onChange={(event) => setAnio(parseInt(event.target.value, 10))}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500">Periodo inicial calculado en {ECUADOR_TIME_ZONE}.</p>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <label className="block text-sm font-medium text-slate-700">
            Empleado para Formulario 107
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form107EmpleadoId}
              onChange={(event) => {
                setForm107EmpleadoId(event.target.value);
                setForm107Precheck(null);
              }}
            >
              <option value="">Seleccionar empleado...</option>
              {empleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.apellidos || ''} {empleado.nombres || ''} - {empleado.cedula || ''}
                </option>
              ))}
            </select>
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-400 disabled:opacity-60"
            type="button"
            disabled={cargando === 'form107-precheck'}
            onClick={validarFormulario107}
          >
            <ShieldCheck className="h-4 w-4" />
            {cargando === 'form107-precheck' ? 'Validando...' : 'Validar Formulario 107'}
          </button>
        </div>
        {form107Precheck && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {form107Precheck.checks.map((check) => (
              <div className={`flex items-start gap-3 rounded-md px-4 py-3 ${check.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} key={check.code}>
                {check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="text-sm font-semibold">{check.label}</p>
                  {check.detail && <p className="mt-1 text-xs opacity-80">{check.detail}</p>}
                </div>
              </div>
            ))}
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
              Plantilla PDF: <span className="font-mono text-xs">{form107Precheck.templateVersion}</span>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {institutionalReports.map((report) => {
          const classes = accentClasses[report.accent];
          return (
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={report.type}>
              <FileText className={`mb-4 ${classes.icon}`} size={40} />
              <h3 className="text-lg font-semibold text-slate-950">{report.title}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{report.entity}</p>
              <p className="mt-3 min-h-16 text-sm leading-6 text-slate-600">{report.description}</p>
              <button
                onClick={() => generarReporte(report.type)}
                disabled={cargando === report.type}
                className={`mt-4 flex w-full items-center justify-center rounded-lg px-4 py-2 text-white disabled:opacity-50 ${classes.button}`}
              >
                <Download size={20} className="mr-2" />
                {cargando === report.type ? 'Generando...' : report.button}
              </button>
            </article>
          );
        })}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-1 h-5 w-5 text-teal-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Reportes internos de nómina</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Exporta resumen, detalle por empleado, matriz empleados por conceptos y reportes contables con filtros por persona, departamento, cargo o centro de costo.
              </p>
            </div>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            type="button"
            disabled={cargando === 'nomina-export'}
            onClick={exportarReporteNomina}
          >
            <Download className="h-4 w-4" />
            {cargando === 'nomina-export' ? 'Exportando...' : 'Exportar'}
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-400 disabled:opacity-60"
            type="button"
            disabled={cargando === 'nomina-anual' || reportCode === 'PAYROLL_SUMMARY'}
            onClick={exportarConsolidadoAnual}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {cargando === 'nomina-anual' ? 'Generando...' : 'Consolidado anual'}
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Reporte</label>
            <select
              value={reportCode}
              onChange={(event) => {
                const nextReport = event.target.value;
                setReportCode(nextReport);
                if (nextReport !== 'PAYROLL_SUMMARY' && format === 'pdf') setFormat('xlsx');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="PAYROLL_DETAIL_TABULAR">Detalle tabular</option>
              <option value="PAYROLL_EMPLOYEE_DETAIL">Detalle por empleado</option>
              <option value="PAYROLL_BENEFITS_MATRIX">Matriz empleados x beneficios</option>
              <option value="PAYROLL_SUMMARY">Resumen de nómina</option>
              <option value="PAYROLL_ACCOUNTING_REPORT">Reporte contable</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Formato</label>
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="xlsx">Excel XLSX</option>
              <option value="csv">CSV</option>
              {reportCode === 'PAYROLL_SUMMARY' && <option value="pdf">PDF</option>}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Empleado ID</label>
            <input
              value={filters.employeeId}
              onChange={(event) => updateFilter('employeeId', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Departamento</label>
            <input
              value={filters.department}
              onChange={(event) => updateFilter('department', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Cargo</label>
            <input
              value={filters.position}
              onChange={(event) => updateFilter('position', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Centro de costo</label>
            <input
              value={filters.costCenter}
              onChange={(event) => updateFilter('costCenter', event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Opcional"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-teal-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Revisión del reporte para entidades</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Revisa datos del empleador, roles cerrados del ejercicio fiscal y plantilla vigente antes de generar el archivo.
              </p>
            </div>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-400 disabled:opacity-60"
            type="button"
            disabled={cargando === 'rdep-precheck'}
            onClick={validarRdep}
          >
            <ShieldCheck className="h-4 w-4" />
            {cargando === 'rdep-precheck' ? 'Validando...' : 'Validar reporte'}
          </button>
        </div>

        {rdepPrecheck && (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {rdepPrecheck.checks.map((check) => (
              <div className={`flex items-start gap-3 rounded-md px-4 py-3 ${check.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} key={check.code}>
                {check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="text-sm font-semibold">{check.label}</p>
                  {check.detail && <p className="mt-1 text-xs opacity-80">{check.detail}</p>}
                </div>
              </div>
            ))}
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
              Verificación técnica: <span className="font-mono text-xs">{rdepPrecheck.xsd?.sha256}</span>
              <span className="ml-2 text-xs text-slate-500">
                {rdepPrecheck.totalEmpleados || 0} trabajadores, {rdepPrecheck.totalRoles || 0} roles cerrados.
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Fuente SRI: {rdepPrecheck.xsd?.officialSourceReconciliation || 'pendiente'}; hash local {rdepPrecheck.xsd?.hashMatchesManifest ? 'coincide' : 'pendiente de revisión'}.
              </span>
            </div>
          </div>
        )}

      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Landmark className="mt-1 h-5 w-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Otros requerimientos de entidades públicas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Estos formatos deben habilitarse por entidad, actividad económica y periodo antes de generar archivos oficiales.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {pendingRequirements.map((requirement) => (
            <div className="flex gap-3 rounded-md bg-slate-50 px-4 py-3" key={requirement}>
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="text-sm text-slate-700">{requirement}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-1 h-5 w-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Criterio de uso</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              RDEP se alimenta de roles cerrados del año fiscal, retenciones y datos del empleado. Los reportes externos se deben validar
              con la parametrización legal vigente antes de enviarlos a producción.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DescargarReportes;
