import React, { useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, FileText, Landmark } from 'lucide-react';
import { authenticatedApi } from '../../services/authenticatedApi';

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
  const [cargando, setCargando] = useState('');

  const generarReporte = async (tipo) => {
    setCargando(tipo);
    try {
      const endpointByType = {
        rdep: '/reportes/rdep',
        sae: '/reportes/sae',
        banco: '/reportes/banco',
      };
      const response = await authenticatedApi.post(endpointByType[tipo], { anio, mes });
      const url = response.data.reporte?.url || response.data.reporte?.csvUrl;

      if (url) {
        window.open(url, '_blank');
      }
      alert('Reporte generado exitosamente');
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || 'Error al generar reporte');
    } finally {
      setCargando('');
    }
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
