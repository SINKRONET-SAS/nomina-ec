import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, FileText, Landmark, ShieldCheck } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';
import { downloadUrl } from '../../utils/downloadUrl';

const institutionalReports = [
  {
    type: 'rdep',
    title: 'RDEP - SRI',
    entity: 'Servicio de Rentas Internas',
    description: 'Anexo de relacion de dependencia para retenciones de impuesto a la renta de empleados.',
    button: 'Generar XML RDEP',
    accent: 'blue',
  },
  {
    type: 'sae',
    title: 'SAE - IESS',
    entity: 'Instituto Ecuatoriano de Seguridad Social',
    description: 'Avisos y aportes de empleados en relacion de dependencia para el IESS.',
    button: 'Generar XML SAE',
    accent: 'green',
  },
  {
    type: 'banco',
    title: 'Archivo bancario',
    entity: 'Bancos configurados',
    description: 'Archivo para pago de nomina mediante transferencia bancaria segun perfil del banco.',
    button: 'Generar archivo de pago',
    accent: 'purple',
  },
];

const pendingRequirements = [
  'Ministerio del Trabajo: reportes laborales que dependan de la obligacion aplicable al empleador.',
  'Contraloria, UAFE u otra entidad publica: formatos habilitados segun actividad, tipo de empresa y periodo.',
  'Anexos SRI distintos a RDEP: se tratan como obligaciones tributarias generales, no como reportes de nomina.',
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
  purple: {
    icon: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
  },
};

function DescargarReportes() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [reportCode, setReportCode] = useState('PAYROLL_DETAIL_TABULAR');
  const [format, setFormat] = useState('xlsx');
  const [filters, setFilters] = useState({
    employeeId: '',
    department: '',
    position: '',
    costCenter: '',
  });
  const [cargando, setCargando] = useState('');
  const [rdepPrecheck, setRdepPrecheck] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const validarRdep = async () => {
    setCargando('rdep-precheck');
    setMessage('');
    setError('');
    try {
      const response = await authenticatedApi.post('/reportes/rdep/precheck', { anio, mes });
      setRdepPrecheck(response.data.precheck);
      setMessage(response.data.precheck.ready
        ? 'RDEP listo para generar con validacion estructural activa.'
        : 'RDEP requiere acciones antes de generar el XML.');
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

  const generarReporte = async (tipo) => {
    setCargando(tipo);
    setMessage('');
    setError('');
    try {
      if (tipo === 'rdep') {
        const precheck = rdepPrecheck?.anio === anio && rdepPrecheck?.mes === mes ? rdepPrecheck : await validarRdep();
        if (!precheck?.ready) {
          setCargando('');
          return;
        }
      }
      const endpointByType = {
        rdep: '/reportes/rdep',
        sae: '/reportes/sae',
        banco: '/reportes/banco',
      };
      const response = await authenticatedApi.post(endpointByType[tipo], { anio, mes });
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
      setMessage(`Reporte de nomina generado: ${response.data.reporte?.totalFilas || 0} filas.`);
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Error al exportar reporte de nomina');
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
        <h1 className="text-2xl font-bold text-slate-950">Reportes para entidades publicas</h1>
        <p className="mt-2 max-w-4xl text-sm text-slate-600">
          Genera reportes propios de nomina para Ecuador. Para SRI se usa RDEP en relacion de dependencia;
          ATS no se muestra aqui porque corresponde a obligaciones tributarias generales.
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
            <label className="block text-sm font-medium text-slate-700">Anio</label>
            <input
              type="number"
              value={anio}
              onChange={(event) => setAnio(parseInt(event.target.value, 10))}
              className="mt-1 rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>
      </div>

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
              <h2 className="text-lg font-semibold text-slate-950">Reportes internos de nomina</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Exporta resumen, detalle tabular o asientos contables de devengamiento y pago con filtros por persona, departamento, cargo o centro de costo.
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
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Reporte</label>
            <select
              value={reportCode}
              onChange={(event) => {
                const nextReport = event.target.value;
                setReportCode(nextReport);
                if (['PAYROLL_DETAIL_TABULAR', 'PAYROLL_ACCOUNTING_ENTRIES'].includes(nextReport) && format === 'pdf') setFormat('xlsx');
              }}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="PAYROLL_DETAIL_TABULAR">Detalle tabular</option>
              <option value="PAYROLL_SUMMARY">Resumen de nomina</option>
              <option value="PAYROLL_ACCOUNTING_ENTRIES">Asientos contables</option>
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
              <h2 className="text-lg font-semibold text-slate-950">Revision del reporte para entidades</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Revisa datos del empleador, nomina cerrada y plantilla vigente antes de generar el archivo.
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
              Verificacion tecnica: <span className="font-mono text-xs">{rdepPrecheck.xsd?.sha256}</span>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <Landmark className="mt-1 h-5 w-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Otros requerimientos de entidades publicas</h2>
            <p className="mt-1 text-sm text-slate-600">
              Estos formatos deben habilitarse por entidad, actividad economica y periodo antes de generar archivos oficiales.
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
              RDEP se alimenta de roles cerrados, retenciones y datos del empleado. Los reportes externos se deben validar
              con la parametrizacion legal vigente antes de enviarlos a produccion.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DescargarReportes;
