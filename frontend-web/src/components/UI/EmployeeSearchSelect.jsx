import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Search } from 'lucide-react';

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function employeeLabel(employee) {
  const name = `${employee?.apellidos || ''} ${employee?.nombres || ''}`.trim();
  return `${name || 'Empleado'}${employee?.cedula ? ` - ${employee.cedula}` : ''}`;
}

function EmployeeSearchSelect({
  employees = [],
  value = '',
  onChange,
  disabledPredicate = () => false,
  disabledSuffix = 'no disponible',
  placeholder = 'Buscar por cédula, apellido o nombre',
  id = 'employee-search',
}) {
  const rootRef = useRef(null);
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === value) || null,
    [employees, value],
  );
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (selectedEmployee) setQuery(employeeLabel(selectedEmployee));
    if (!value) setQuery((current) => (open ? current : ''));
  }, [open, selectedEmployee, value]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const normalizedQuery = normalizeSearch(selectedEmployee && query === employeeLabel(selectedEmployee) ? '' : query);
  const results = useMemo(() => employees
    .filter((employee) => {
      if (!normalizedQuery) return true;
      return normalizeSearch([
        employee.cedula,
        employee.apellidos,
        employee.nombres,
        employee.id,
      ].filter(Boolean).join(' ')).includes(normalizedQuery);
    })
    .slice(0, 50), [employees, normalizedQuery]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [normalizedQuery]);

  const selectEmployee = (employee) => {
    if (!employee || disabledPredicate(employee)) return;
    onChange(employee.id);
    setQuery(employeeLabel(employee));
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current <= 0 ? Math.max(results.length - 1, 0) : current - 1));
      return;
    }
    if (event.key === 'Enter' && open && results[activeIndex]) {
      event.preventDefault();
      selectEmployee(results[activeIndex]);
    }
  };

  return (
    <div className="relative mt-1" ref={rootRef}>
      <div className="flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 focus-within:border-teal-600 focus-within:ring-1 focus-within:ring-teal-600">
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          aria-autocomplete="list"
          aria-activedescendant={open && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-controls={`${id}-results`}
          aria-expanded={open}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm outline-none"
          id={id}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange('');
            setOpen(true);
          }}
          onFocus={(event) => {
            setOpen(true);
            if (selectedEmployee) event.currentTarget.select();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          role="combobox"
          value={query}
        />
      </div>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg" id={`${id}-results`} role="listbox">
          {results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-slate-500">No encontramos empleados con esa búsqueda.</p>
          ) : results.map((employee, index) => {
            const disabled = disabledPredicate(employee);
            const selected = employee.id === value;
            return (
              <button
                aria-selected={selected}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm ${index === activeIndex ? 'bg-teal-50' : 'hover:bg-slate-50'} ${disabled ? 'cursor-not-allowed text-slate-400' : 'text-slate-800'}`}
                disabled={disabled}
                id={`${id}-option-${index}`}
                key={employee.id}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectEmployee(employee)}
                role="option"
                type="button"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{employeeLabel(employee)}</span>
                  {disabled && <span className="block text-xs">{disabledSuffix}</span>}
                </span>
                {selected && <Check className="h-4 w-4 shrink-0 text-teal-700" />}
              </button>
            );
          })}
          <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            Mostrando {results.length} de {employees.length} empleados.
          </p>
        </div>
      )}
    </div>
  );
}

export default EmployeeSearchSelect;
