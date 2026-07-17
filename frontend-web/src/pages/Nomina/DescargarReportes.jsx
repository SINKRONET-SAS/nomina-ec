import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileText, Landmark, Search, ShieldCheck } from 'lucide-react';
import CompactNotice from '../../components/UI/CompactNotice';
import { authenticatedApi } from '../../services/authenticatedApi';
import { downloadUrl } from '../../utils/downloadUrl';
import { ECUADOR_TIME_ZONE, currentPeriodEC } from '../../utils/dateFormat';

const institutionalReports = [
  {
    type: 'rdep',
    title: 'RDEP - SRI',
    entity: 'Servicio de Rentas Internas',
    description: 'Anexo anual de relación de dependencia para retenciones de empleados.',
    button: 'Generar XML RDEP',
    accent: 'blue',
    status: 'Oficial SRI validado',
    statusTone: 'emerald',
  },
  {
    type: 'form107',
    title: 'Formulario 107 - SRI',
    entity: 'Servicio de Rentas Internas',
    description: 'PDF anual por trabajador con ingresos y retenciones.',
    button: 'Generar PDF 107',
    accent: 'blue',
    status: 'Oficial SRI validado',
    statusTone: 'emerald',
  },
];

const iessPreparationReport = {
  type: 'sae',
  title: 'Batch IESS',
  entity: 'Instituto Ecuatoriano de Seguridad Social',
  description: 'Genera archivo ASCII TXT para movimiento MSU (nuevo sueldo), separado por punto y coma y con una fila por trabajador.',
  button: 'Generar TXT IESS',
  status: 'TXT/DAT IESS',
  statusTone: 'emerald',
};

const pendingRequirements = [
  'Ministerio del Trabajo: reportes laborales según la obligación aplicable.',
  'Contraloría, UAFE u otra entidad pública: formatos según actividad y tipo de empresa.',
  'Anexos SRI distintos a RDEP: obligaciones tributarias generales.',
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

const statusClasses = {
  amber: 'border-amber-200 bg-amber-50 text-amber-800',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
};

function StatusBadge({ children, tone = 'slate' }) {
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${statusClasses[tone] || statusClasses.slate}`}>
      {children}
    </span>
  );
}

function DescargarReportes() {
  const initialPeriod = currentPeriodEC();
  const [anio, setAnio] = useState(initialPeriod.anio);
  const [mes, setMes] = useState(initialPeriod.mes);
  const [reportCode, setReportCode] = useState('PAYROLL_DETAIL_TABULAR');
  const [format, setFormat] = useState('xlsx');
  const [reportScope, setReportScope] = useState('global');
  const [reportEmployeeSearch, setReportEmployeeSearch] = useState('');
  const [reportColumns, setReportColumns] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [accountingMode, setAccountingMode] = useState('detail');
  const [filters, setFilters] = useState({
    employeeId: '',
    department: '',
    position: '',
    costCenter: '',
  });
  const [empleados, setEmpleados] = useState([]);
  const [form107EmpleadoId, setForm107EmpleadoId] = useState('');
  const [form107Search, setForm107Search] = useState('');
  const [cargando, setCargando] = useState('');
  const [rdepPrecheck, setRdepPrecheck] = useState(null);
  const [form107Precheck, setForm107Precheck] = useState(null);
  const [saePrecheck, setSaePrecheck] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    authenticatedApi.get(`/reportes/nomina/columnas?reportCode=${encodeURIComponent(reportCode)}`)
      .then((response) => {
        if (!active) return;
        const columns = response.data.columns || [];
        setReportColumns(columns);
        setSelectedColumns(columns.map((column) => column.key));
      })
      .catch((err) => {
        console.error('[REPORTES] No se pudo cargar el catálogo de columnas', {
          code: err.response?.data?.error || 'REPORT_COLUMNS_LOAD_ERROR',
          statusCode: err.response?.status || 500,
          correlationId: err.response?.data?.correlationId || 'frontend-report-columns',
          userId: null,
          message: err.message,
        });
        if (active) {
          setReportColumns([]);
          setSelectedColumns([]);
        }
      });
    return () => { active = false; };
  }, [reportCode]);

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

  const validarSae = async () => {
    setCargando('sae-precheck');
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.post('/reportes/sae/precheck', { anio, mes });
      setSaePrecheck(response.data.precheck);
      setMessage(response.data.precheck.ready
        ? 'Archivo batch IESS MSU listo para generar en TXT/DAT.'
        : 'IESS requiere acciones antes de generar el archivo batch.');
      return response.data.precheck;
    } catch (err) {
      const nextError = err.response?.data?.message || err.response?.data?.error || 'No pudimos prevalidar datos IESS.';
      setError(nextError);
      setSaePrecheck(null);
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
      if (tipo === 'sae') {
        const precheck = saePrecheck?.anio === anio && saePrecheck?.mes === mes
          ? saePrecheck
          : await validarSae();
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
      const reportFilters = buildReportFilters();
      if (!reportFilters) return;
      const response = await authenticatedApi.post('/reportes/nomina/exportar', {
        anio,
        mes,
        reportCode,
        format,
        filters: { ...reportFilters, columns: selectedColumns },
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
      const reportFilters = buildReportFilters();
      if (!reportFilters) return;
      const response = await authenticatedApi.get(`/reportes/nomina/${anio}/consolidado`, {
        params: {
          reportCode,
          filters: JSON.stringify({ ...reportFilters, columns: selectedColumns }),
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

  const updateReportScope = (value) => {
    setReportScope(value);
    if (value === 'global') {
      updateFilter('employeeId', '');
      setReportEmployeeSearch('');
    }
  };

  const buildReportFilters = () => {
    if (reportScope === 'individual' && !filters.employeeId) {
      setError('Selecciona un empleado para generar el reporte individual.');
      setCargando('');
      return null;
    }

    return {
      ...filters,
      employeeId: reportScope === 'individual' ? filters.employeeId : '',
      accountingMode,
    };
  };

  const normalizedForm107Search = form107Search.trim().toLowerCase();
  const filteredEmpleados = empleados
    .filter((empleado) => {
      if (!normalizedForm107Search) return true;
      const haystack = [
        empleado.cedula,
        empleado.nombres,
        empleado.apellidos,
        empleado.id,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(normalizedForm107Search);
    })
    .slice(0, 50);

  const normalizedReportEmployeeSearch = reportEmployeeSearch.trim().toLowerCase();
  const filteredReportEmployees = empleados
    .filter((empleado) => {
      if (!normalizedReportEmployeeSearch) return true;
      const haystack = [
        empleado.cedula,
        empleado.nombres,
        empleado.apellidos,
        empleado.id,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(normalizedReportEmployeeSearch);
    })
    .slice(0, 80);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Reportes para entidades públicas</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Genera reportes SRI validados, batch IESS TXT/DAT y archivos internos aplicables a nómina Ecuador.
        </p>
      </div>

      <CompactNotice tone="amber" title="Gobierno de formatos">
        RDEP y Formulario 107 se tratan como reportes SRI validados contra fuentes versionadas. IESS usa carga batch ASCII TXT/DAT para novedades; SKNOMINA genera MSU y no expone XML IESS.
      </CompactNotice>

      {message && <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>}

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Mes</label>
            <select
              value={mes}
              onChange={(event) => {
                setMes(parseInt(event.target.value, 10));
                setSaePrecheck(null);
              }}
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
              onChange={(event) => {
                setAnio(parseInt(event.target.value, 10));
                setRdepPrecheck(null);
                setForm107Precheck(null);
                setSaePrecheck(null);
              }}
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
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                className="w-full border-0 p-0 text-sm outline-none"
                placeholder="Buscar por cédula, apellido, nombre o ID"
                value={form107Search}
                onChange={(event) => setForm107Search(event.target.value)}
              />
            </div>
            <select
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={form107EmpleadoId}
              onChange={(event) => {
                setForm107EmpleadoId(event.target.value);
                setForm107Precheck(null);
              }}
            >
              <option value="">Seleccionar empleado...</option>
              {filteredEmpleados.map((empleado) => (
                <option key={empleado.id} value={empleado.id}>
                  {empleado.apellidos || ''} {empleado.nombres || ''} - {empleado.cedula || ''}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs font-normal text-slate-500">
              Mostrando {filteredEmpleados.length} de {empleados.length} trabajadores cargados.
            </span>
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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {institutionalReports.map((report) => {
          const classes = accentClasses[report.accent];
          return (
            <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={report.type}>
              <FileText className={`mb-4 ${classes.icon}`} size={40} />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-950">{report.title}</h3>
                <StatusBadge tone={report.statusTone}>{report.status}</StatusBadge>
              </div>
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

      <section className="rounded-lg border border-emerald-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Landmark className="mt-1 h-5 w-5 text-emerald-700" />
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-950">{iessPreparationReport.title}</h2>
                <StatusBadge tone={iessPreparationReport.statusTone}>{iessPreparationReport.status}</StatusBadge>
              </div>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{iessPreparationReport.entity}</p>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">{iessPreparationReport.description}</p>
              <p className="mt-2 text-xs font-semibold text-emerald-800">Usa el establecimiento principal configurado en Datos de empresa &gt; IESS.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => generarReporte(iessPreparationReport.type)}
              disabled={cargando === iessPreparationReport.type}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              type="button"
            >
              <Download size={18} />
              {cargando === iessPreparationReport.type ? 'Generando...' : iessPreparationReport.button}
            </button>
            <button
              onClick={validarSae}
              disabled={cargando === 'sae-precheck'}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-emerald-300 px-4 text-sm font-semibold text-emerald-800 hover:border-emerald-500 disabled:opacity-50"
              type="button"
            >
              <ShieldCheck size={18} />
              {cargando === 'sae-precheck' ? 'Validando...' : 'Prevalidar batch'}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-1 h-5 w-5 text-teal-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Reportes internos de nómina</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Exporta formatos verticales, resumen, ledger y reportes contables con filtros.</p>
            </div>
          </div>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            type="button"
            disabled={cargando === 'nomina-export'}
            onClick={exportarReporteNomina}
          >
            <Download className="h-4 w-4" />
            {cargando === 'nomina-export' ? 'Exportando...' : 'Exportar mes'}
          </button>
          <button
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-teal-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-400 disabled:opacity-60"
            type="button"
            disabled={cargando === 'nomina-anual' || reportCode === 'PAYROLL_SUMMARY'}
            onClick={exportarConsolidadoAnual}
          >
            <FileSpreadsheet className="h-4 w-4" />
            {cargando === 'nomina-anual' ? 'Generando...' : 'Acumulado anual'}
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
              <option value="PAYROLL_DETAIL_TABULAR">Detalle tabular (1 fila por empleado)</option>
              <option value="PAYROLL_NOVELTY_MATRIX">Matriz de novedades del rol</option>
              <option value="PAYROLL_EMPLOYEE_DETAIL">Detalle por concepto (vertical)</option>
              <option value="PAYROLL_BENEFIT_MOVEMENT_BALANCE">Ledger beneficios y saldos (recomendado 1000+ empleados)</option>
              <option value="PAYROLL_BENEFITS_MATRIX">Matriz de conceptos (uso puntual)</option>
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
            <label className="block text-sm font-medium text-slate-700">Alcance</label>
            <select
              value={reportScope}
              onChange={(event) => updateReportScope(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="global">Global</option>
              <option value="individual">Individual</option>
            </select>
          </div>
          {reportCode === 'PAYROLL_ACCOUNTING_REPORT' && (
            <div>
              <label className="block text-sm font-medium text-slate-700">Salida contable</label>
              <select
                value={accountingMode}
                onChange={(event) => setAccountingMode(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="detail">Detalle por empleado</option>
                <option value="consolidated">Consolidado por cuenta</option>
              </select>
            </div>
          )}
          {reportScope === 'individual' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Empleado</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="w-full border-0 p-0 text-sm outline-none"
                  placeholder="Buscar por cedula, apellido, nombre o ID"
                  value={reportEmployeeSearch}
                  onChange={(event) => setReportEmployeeSearch(event.target.value)}
                />
              </div>
              <select
                value={filters.employeeId}
                onChange={(event) => updateFilter('employeeId', event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Seleccionar empleado...</option>
                {filteredReportEmployees.map((empleado) => (
                  <option key={empleado.id} value={empleado.id}>
                    {empleado.apellidos || ''} {empleado.nombres || ''} - {empleado.cedula || ''}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-slate-500">
                Mostrando {filteredReportEmployees.length} de {empleados.length} trabajadores cargados.
              </span>
            </div>
          )}
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
        {reportColumns.length > 0 && (
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Columnas personalizadas</h3>
                <p className="mt-1 text-xs text-slate-600">Selecciona las columnas que se exportarán. El servidor valida las claves permitidas.</p>
              </div>
              <div className="flex gap-2 text-xs font-semibold">
                <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700" onClick={() => setSelectedColumns(reportColumns.map((column) => column.key))}>Todas</button>
                <button type="button" className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-700" onClick={() => setSelectedColumns([])}>Ninguna</button>
              </div>
            </div>
            <div className="mt-3 grid max-h-44 gap-2 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
              {reportColumns.map((column) => (
                <label key={column.key} className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    onChange={(event) => setSelectedColumns((current) => event.target.checked
                      ? [...current, column.key]
                      : current.filter((key) => key !== column.key))}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        {reportCode === 'PAYROLL_NOVELTY_MATRIX' && (
          <CompactNotice className="mt-4" tone="teal" title="Matriz de novedades">
            Exporta empleados en filas y novedades del rol en columnas, con totales de ingreso, deduccion y neto por novedad.
          </CompactNotice>
        )}
        {reportCode === 'PAYROLL_BENEFITS_MATRIX' && (
          <CompactNotice className="mt-4" tone="amber" title="Uso puntual">
            La matriz agrega columnas dinámicas por concepto. Para nóminas grandes usa el ledger o el detalle por concepto, que mantienen una estructura vertical auditable.
          </CompactNotice>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-5 w-5 text-teal-700" />
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Revisión del reporte para entidades</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">Valida empleador, roles cerrados y plantilla vigente antes de generar.</p>
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

        {saePrecheck && (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {saePrecheck.checks.map((check) => (
              <div className={`flex items-start gap-3 rounded-md px-4 py-3 ${check.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`} key={check.code}>
                {check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                <div>
                  <p className="text-sm font-semibold">{check.label}</p>
                  {check.detail && <p className="mt-1 text-xs opacity-80">{check.detail}</p>}
                </div>
              </div>
            ))}
            <div className="rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-700 lg:col-span-2">
              Batch IESS: <span className="font-mono text-xs">{saePrecheck.manifest?.version}</span>
              <span className="ml-2 text-xs text-slate-500">
                {saePrecheck.totalEmpleados || 0} trabajadores, periodo {String(saePrecheck.mes).padStart(2, '0')}/{saePrecheck.anio}.
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Fuente IESS: {saePrecheck.manifest?.officialSourceReconciliation || 'pendiente'}; formato {saePrecheck.manifest?.batchFormatStatus || 'pendiente'}; {saePrecheck.manifest?.encoding || 'ASCII'} separado por {saePrecheck.manifest?.separator || ';'}
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
            <p className="mt-1 text-sm text-slate-600">Habilita solo los formatos que apliquen a la empresa y al período.</p>
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

      <CompactNotice tone="teal" title="Criterio de uso">
        RDEP usa roles cerrados, retenciones y datos del trabajador. Valida la parametrización legal antes de enviar archivos oficiales.
      </CompactNotice>
    </div>
  );
}

export default DescargarReportes;
