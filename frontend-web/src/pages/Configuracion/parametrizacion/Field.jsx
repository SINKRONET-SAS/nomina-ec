import React from 'react';
import ModulePermissionMatrix from '../../../components/ModulePermissionMatrix';

function Field({ field, value, onChange, options = [] }) {
  const baseClass = 'form-control';
  const fieldClass = field.wide ? 'form-field-full' : 'form-field-third';

  if (field.type === 'modulePermissionMatrix') {
    return (
      <fieldset className="form-field-full">
        <legend className="mb-2 text-sm font-medium text-slate-700">{field.label}</legend>
        <ModulePermissionMatrix
          value={value || {}}
          onChange={(newValue) => onChange(field.name, newValue)}
          readOnly={field.disabled}
        />
      </fieldset>
    );
  }

  if (field.type === 'textarea') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <textarea
          className="form-textarea"
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        disabled={field.disabled}
      />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select className={baseClass} value={value} onChange={(event) => onChange(field.name, event.target.value)} disabled={field.disabled}>
          {field.options.map((option) => (
            <option key={option.value || option} value={option.value || option}>{option.label || option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'payrollConceptSelect') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          className={baseClass}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          required={field.required}
          disabled={field.disabled || options.length === 0}
        >
          <option value="">{options.length === 0 ? 'Sin conceptos disponibles' : 'Selecciona un concepto'}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'resourceSelect') {
    return (
      <label className={fieldClass}>
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
        <select
          className={baseClass}
          value={value}
          onChange={(event) => onChange(field.name, event.target.value)}
          required={field.required}
          disabled={field.disabled || options.length === 0}
        >
          <option value="">{options.length === 0 ? field.emptyLabel || 'Primero crea un registro' : field.selectLabel || 'Selecciona una opcion'}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.name} ({option.code})</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === 'multiCheckbox') {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className={field.wide ? 'form-field-full' : 'form-field-third'}>
        <legend className="text-sm font-medium text-slate-700">{field.label}</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {field.options.map((option) => (
            <label className="flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700" key={option.value}>
              <input
                className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                type="checkbox"
                checked={selected.includes(option.value)}
                disabled={field.disabled}
                onChange={(event) => {
                  const next = event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value);
                  onChange(field.name, next);
                }}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <label className="form-field-third flex h-10 items-center gap-3 self-end rounded-md border border-slate-200 px-3 text-sm">
        <input
          className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(field.name, event.target.checked)}
          disabled={field.disabled}
        />
        <span className="text-sm font-medium text-slate-700">{field.label}</span>
      </label>
    );
  }

  return (
    <label className={fieldClass}>
      <span className="text-sm font-medium text-slate-700">{field.label}</span>
      <input
        className={baseClass}
        type={field.type || 'text'}
        step={field.step}
        value={value}
        onChange={(event) => onChange(field.name, event.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        disabled={field.disabled}
      />
    </label>
  );
}

export default Field;
