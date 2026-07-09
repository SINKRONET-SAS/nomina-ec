import React from 'react';
import {
  formatCurrency,
  formatRate,
  labelLegalParameter,
  latestLegalParameters,
  legalParameterValue,
  normalizeIncomeTaxBrackets,
} from './legalParameterDisplay';

function parseParameterValue(record) {
  let value = record?.value || {};
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return {}; }
  }
  return value && typeof value === 'object' ? value : {};
}

function findParameter(parameters, key) {
  return parameters.find((record) => record.parameter_key === key);
}

function amountValue(record) {
  const value = parseParameterValue(record);
  const amount = Number(value.amount);
  return Number.isFinite(amount) ? amount : null;
}

function multiplierValue(record) {
  const value = parseParameterValue(record);
  const multiplier = Number(value.multiplier);
  if (Number.isFinite(multiplier)) return multiplier;

  const rate = Number(value.rate);
  if (Number.isFinite(rate)) return 1 + rate;

  const amount = Number(value.amount);
  return Number.isFinite(amount) ? amount : null;
}

function numberLabel(value, suffix = '') {
  if (!Number.isFinite(value)) return 'Pendiente';
  return `${value.toLocaleString('es-EC', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}${suffix}`;
}

function OvertimeFormulaPreview({ parameters }) {
  const monthlyHoursRecord = findParameter(parameters, 'jornada_horas_mensuales');
  const weeklyLimitRecord = findParameter(parameters, 'horas_extra_limite_semanal');
  const supplementaryRecord = findParameter(parameters, 'horas_extra_recargo_suplementaria');
  const extraordinaryRecord = findParameter(parameters, 'horas_extra_recargo_extraordinaria');

  const monthlyHours = amountValue(monthlyHoursRecord);
  const weeklyLimit = amountValue(weeklyLimitRecord);
  const supplementaryMultiplier = multiplierValue(supplementaryRecord);
  const extraordinaryMultiplier = multiplierValue(extraordinaryRecord);

  return (
    <div className="rounded-md border border-teal-100 bg-teal-50 px-3 py-3 text-sm text-teal-950">
      <p className="font-semibold">Fórmula de horas extra parametrizada</p>
      <p className="mt-1 leading-5">
        Valor hora = sueldo mensual / horas mensuales. HE suplementaria = horas x valor hora x multiplicador suplementario.
        HE extraordinaria = horas x valor hora x multiplicador extraordinario.
      </p>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Horas mensuales</dt>
          <dd><code>jornada_horas_mensuales</code>: {numberLabel(monthlyHours, ' h')}</dd>
        </div>
        <div>
          <dt className="font-semibold">Límite semanal</dt>
          <dd><code>horas_extra_limite_semanal</code>: {numberLabel(weeklyLimit, ' h')}</dd>
        </div>
        <div>
          <dt className="font-semibold">Suplementaria</dt>
          <dd><code>horas_extra_recargo_suplementaria</code>: x {numberLabel(supplementaryMultiplier)}</dd>
        </div>
        <div>
          <dt className="font-semibold">Extraordinaria</dt>
          <dd><code>horas_extra_recargo_extraordinaria</code>: x {numberLabel(extraordinaryMultiplier)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function LegalParametersPreview({ records }) {
  const parameters = latestLegalParameters(records);

  if (parameters.length === 0) {
    return (
      <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Carga los parámetros obligatorios para ver aquí la matriz legal completa usada por el motor.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <OvertimeFormulaPreview parameters={parameters} />
      <div className="overflow-hidden rounded-md border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
          <p className="text-sm font-semibold text-slate-900">Parámetros legales visibles</p>
          <p className="mt-1 text-xs text-slate-500">Última versión por código, con estado y fuente.</p>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead className="sticky top-0 bg-white text-slate-500 shadow-sm">
              <tr>
                <th className="px-3 py-2 font-semibold">Parámetro</th>
                <th className="px-3 py-2 font-semibold">Año</th>
                <th className="px-3 py-2 font-semibold">Valor usado</th>
                <th className="px-3 py-2 font-semibold">Estado</th>
                <th className="px-3 py-2 font-semibold">Fuente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parameters.map((record) => (
                <tr key={record.id}>
                  <td className="px-3 py-2 font-semibold text-slate-800">{labelLegalParameter(record.parameter_key)}</td>
                  <td className="px-3 py-2 font-mono">{record.period_year}</td>
                  <td className="px-3 py-2 font-mono">{legalParameterValue(record)}</td>
                  <td className="px-3 py-2">{record.validation_status}</td>
                  <td className="px-3 py-2">{record.source_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function IncomeTaxTablePreview({ records }) {
  const latest = [...records].sort((a, b) => {
    if (Number(b.period_year) !== Number(a.period_year)) return Number(b.period_year) - Number(a.period_year);
    return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
  })[0];
  const brackets = normalizeIncomeTaxBrackets(latest);

  if (!latest || brackets.length === 0) {
    return (
      <div className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Carga o registra la tabla IR para verla completa aquí.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-md border border-slate-200">
      <div className="border-b border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-sm font-semibold text-slate-900">Tabla IR visible {latest.period_year}</p>
        <p className="mt-1 text-xs text-slate-500">
          {latest.validation_status} - {latest.source_name || 'sin fuente registrada'}
        </p>
      </div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="sticky top-0 bg-white text-slate-500 shadow-sm">
            <tr>
              <th className="px-3 py-2 font-semibold">Fracción básica</th>
              <th className="px-3 py-2 font-semibold">Exceso hasta</th>
              <th className="px-3 py-2 font-semibold">Impuesto</th>
              <th className="px-3 py-2 font-semibold">%</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {brackets.map((bracket, index) => (
              <tr key={`${latest.id}-${index}`}>
                <td className="px-3 py-2 font-mono">{formatCurrency(bracket.from ?? bracket.fraccion_basica)}</td>
                <td className="px-3 py-2 font-mono">{formatCurrency(bracket.to ?? bracket.exceso_hasta)}</td>
                <td className="px-3 py-2 font-mono">{formatCurrency(bracket.baseTax ?? bracket.impuesto_fraccion_basica)}</td>
                <td className="px-3 py-2 font-mono">{formatRate(bracket.rate ?? bracket.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {latest.notes && (
        <p className="border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          {latest.notes}
        </p>
      )}
    </div>
  );
}
