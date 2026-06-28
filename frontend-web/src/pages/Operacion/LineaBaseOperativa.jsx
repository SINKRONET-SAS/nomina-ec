import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileText, Settings2 } from 'lucide-react';
import { operationalBaseline, statusStyles } from '../../config/operationalBaseline';

function groupByOwner(items) {
  return items.reduce((groups, item) => {
    const key = item.owner;
    return {
      ...groups,
      [key]: [...(groups[key] || []), item],
    };
  }, {});
}

function LineaBaseOperativa() {
  const grouped = groupByOwner(operationalBaseline);
  const visibleCount = operationalBaseline.filter((item) => item.status === 'visible').length;
  const configurationCount = operationalBaseline.filter((item) => item.owner === 'Configuracion').length;
  const monthlyCount = operationalBaseline.filter((item) => item.owner === 'Operacion mensual').length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Configuracion operativa</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">Checklist para operar SKNOMINA</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Revisa que la empresa, los empleados, la asistencia, la nomina y los reportes tengan la informacion
              necesaria antes de cerrar el periodo.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-emerald-50 px-4 py-3">
              <p className="text-2xl font-semibold text-emerald-800">{visibleCount}</p>
              <p className="text-xs font-medium text-emerald-900">items</p>
            </div>
            <div className="rounded-md bg-blue-50 px-4 py-3">
              <p className="text-2xl font-semibold text-blue-800">{configurationCount}</p>
              <p className="text-xs font-medium text-blue-900">configuracion</p>
            </div>
            <div className="rounded-md bg-amber-50 px-4 py-3">
              <p className="text-2xl font-semibold text-amber-900">{monthlyCount}</p>
              <p className="text-xs font-medium text-amber-950">operacion</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300" to="/dashboard/configuracion/parametrizacion">
          <Settings2 className="h-6 w-6 text-teal-700" />
          <h2 className="mt-3 font-semibold text-slate-950">Revisar configuracion</h2>
          <p className="mt-1 text-sm text-slate-600">Empresa, parametros, bancos, usuarios, roles, jornadas y zonas.</p>
        </Link>
        <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300" to="/dashboard/operacion/integral">
          <CheckCircle2 className="h-6 w-6 text-teal-700" />
          <h2 className="mt-3 font-semibold text-slate-950">Ver centro de trabajo</h2>
          <p className="mt-1 text-sm text-slate-600">Accesos directos a los flujos usados por RRHH y administracion.</p>
        </Link>
        <Link className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-300" to="/dashboard/nomina/reportes">
          <FileText className="h-6 w-6 text-teal-700" />
          <h2 className="mt-3 font-semibold text-slate-950">Reportes y pagos</h2>
          <p className="mt-1 text-sm text-slate-600">Roles, reportes para entidades y archivo bancario cuando corresponda.</p>
        </Link>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <AlertCircle className="h-6 w-6 text-amber-700" />
          <h2 className="mt-3 font-semibold text-amber-950">Revisa antes de cerrar</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Los parametros laborales, las novedades pendientes y los datos bancarios deben estar completos.
          </p>
        </div>
      </section>

      {Object.entries(grouped).map(([owner, items]) => (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm" key={owner}>
          <div className="mb-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal-700" />
            <h2 className="text-lg font-semibold text-slate-950">{owner}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <article className="rounded-lg border border-slate-200 p-4" key={item.code}>
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-md bg-slate-50 p-2 text-teal-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}>
                      {item.statusLabel}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 min-h-16 text-sm leading-6 text-slate-600">{item.summary}</p>
                  <Link className="mt-4 inline-flex min-h-9 items-center rounded-md border border-slate-200 px-3 text-sm font-semibold text-teal-700 hover:border-teal-300" to={item.href}>
                    {item.action}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

export default LineaBaseOperativa;
