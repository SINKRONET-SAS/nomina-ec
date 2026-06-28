import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

function IncomeTaxTableFields({ values, onFieldChange, onBracketChange, onAddBracket, onRemoveBracket }) {
  const inputClass = 'form-control';

  return (
    <div className="space-y-5">
      <div className="form-grid">
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">Año fiscal</span>
          <input
            className={inputClass}
            type="number"
            value={values.period_year}
            onChange={(event) => onFieldChange('period_year', event.target.value)}
            required
          />
        </label>
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">Fuente oficial</span>
          <input
            className={inputClass}
            value={values.source_name}
            onChange={(event) => onFieldChange('source_name', event.target.value)}
            placeholder="SRI"
          />
        </label>
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">URL de respaldo</span>
          <input
            className={inputClass}
            type="url"
            value={values.source_url}
            onChange={(event) => onFieldChange('source_url', event.target.value)}
            placeholder="https://www.sri.gob.ec/..."
          />
        </label>
        <label className="form-field-third">
          <span className="text-sm font-medium text-slate-700">Fecha de fuente</span>
          <input
            className={inputClass}
            type="date"
            value={values.source_date}
            onChange={(event) => onFieldChange('source_date', event.target.value)}
          />
        </label>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-semibold">Fracción básica</th>
              <th className="px-3 py-2 font-semibold">Exceso hasta</th>
              <th className="px-3 py-2 font-semibold">Impuesto fracción básica</th>
              <th className="px-3 py-2 font-semibold">Porcentaje decimal</th>
              <th className="w-14 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {values.brackets.map((bracket, index) => (
              <tr key={`ir-${index}`}>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={bracket.from}
                    onChange={(event) => onBracketChange(index, 'from', event.target.value)}
                    required
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={bracket.to}
                    onChange={(event) => onBracketChange(index, 'to', event.target.value)}
                    placeholder="Sin límite"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    value={bracket.baseTax}
                    onChange={(event) => onBracketChange(index, 'baseTax', event.target.value)}
                    required
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    className={inputClass}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={bracket.rate}
                    onChange={(event) => onBracketChange(index, 'rate', event.target.value)}
                    placeholder="0.05"
                    required
                  />
                </td>
                <td className="px-3 py-2">
                  <button
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:border-red-200 hover:text-red-700 disabled:opacity-40"
                    type="button"
                    disabled={values.brackets.length === 1}
                    onClick={() => onRemoveBracket(index)}
                    title="Eliminar intervalo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-teal-700 hover:border-teal-300"
        type="button"
        onClick={onAddBracket}
      >
        <Plus className="h-4 w-4" />
        Agregar intervalo
      </button>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Notas de revisión</span>
        <textarea
          className="form-textarea"
          value={values.notes}
          onChange={(event) => onFieldChange('notes', event.target.value)}
          placeholder="Resolución, ejercicio fiscal, observaciones de validación..."
        />
      </label>
    </div>
  );
}

export default IncomeTaxTableFields;
