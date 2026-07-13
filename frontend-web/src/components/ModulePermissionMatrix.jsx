// ============================================================
// SKNOMINA - Matriz visual de permisos por modulo
// Muestra tabla con filas = modulos y checkbox de acceso.
// ============================================================
import React from 'react';
import { Check, X } from 'lucide-react';

const ALL_MODULES = [
  { code: 'empleados', label: 'Empleados', description: 'Gestion de empleados, importacion, terminacion' },
  { code: 'asistencia', label: 'Asistencia', description: 'Marcaciones, novedades, reportes de asistencia' },
  { code: 'operacion', label: 'Operacion', description: 'Permisos laborales, movilizacion' },
  { code: 'nomina', label: 'Nomina', description: 'Periodos, calculo, cierre, roles de pago' },
  { code: 'documentos', label: 'Documentos', description: 'Contratos, finiquitos, actas de dotacion' },
  { code: 'reportes', label: 'Reportes', description: 'RDEP, Form107, prevalidacion IESS, archivos bancarios' },
  { code: 'parametrizacion', label: 'Parametrizacion', description: 'Centro de configuracion' },
  { code: 'comunicaciones', label: 'Comunicaciones', description: 'Email SMTP, notificaciones' },
  { code: 'auditoria', label: 'Auditoria', description: 'Log de auditoria del sistema' },
];

const DEFAULT_PERMISSIONS = {
  admin_rrhh: {
    empleados: true, asistencia: true, operacion: true, nomina: true,
    documentos: true, reportes: true, parametrizacion: true, comunicaciones: true, auditoria: false,
  },
  supervisor: {
    empleados: true, asistencia: true, operacion: false, nomina: false,
    documentos: false, reportes: false, parametrizacion: false, comunicaciones: false, auditoria: false,
  },
  empleado: {
    empleados: false, asistencia: false, operacion: false, nomina: false,
    documentos: false, reportes: false, parametrizacion: false, comunicaciones: false, auditoria: false,
  },
};

const ROLE_LABELS = {
  admin_rrhh: 'Admin RRHH',
  supervisor: 'Supervisor',
  empleado: 'Empleado',
};

export default function ModulePermissionMatrix({ value, onChange, readOnly }) {
  const permissions = value || {};

  const roles = ['admin_rrhh', 'supervisor', 'empleado'];

  function handleToggle(role, moduleCode) {
    if (readOnly) return;

    const current = { ...permissions };
    if (!current[role]) {
      current[role] = { ...(DEFAULT_PERMISSIONS[role] || {}) };
    }
    current[role] = { ...current[role], [moduleCode]: !current[role][moduleCode] };
    onChange(current);
  }

  function isEnabled(role, moduleCode) {
    if (permissions[role] && typeof permissions[role][moduleCode] === 'boolean') {
      return permissions[role][moduleCode];
    }
    return DEFAULT_PERMISSIONS[role]?.[moduleCode] || false;
  }

  function isDefault(role, moduleCode) {
    if (!permissions[role] || typeof permissions[role][moduleCode] !== 'boolean') {
      return true;
    }
    return permissions[role][moduleCode] === (DEFAULT_PERMISSIONS[role]?.[moduleCode] || false);
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-teal-50">
            <th className="border border-teal-200 px-3 py-2 text-left font-semibold text-teal-800">
              Modulo
            </th>
            {roles.map((role) => (
              <th key={role} className="border border-teal-200 px-3 py-2 text-center font-semibold text-teal-800">
                {ROLE_LABELS[role]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ALL_MODULES.map((mod) => (
            <tr key={mod.code} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-3 py-2">
                <div className="font-medium text-gray-900">{mod.label}</div>
                <div className="text-xs text-gray-500">{mod.description}</div>
              </td>
              {roles.map((role) => {
                const enabled = isEnabled(role, mod.code);
                const isDefault_ = isDefault(role, mod.code);
                return (
                  <td key={role} className="border border-gray-200 px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggle(role, mod.code)}
                      disabled={readOnly}
                      className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
                        readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100'
                      } ${enabled
                        ? 'bg-teal-100 text-teal-700'
                        : 'bg-gray-100 text-gray-400'
                      } ${!isDefault_ ? 'ring-2 ring-amber-400' : ''}`}
                      title={
                        isDefault_
                          ? `${enabled ? 'Habilitado' : 'Deshabilitado'} (por defecto del rol)`
                          : `${enabled ? 'Habilitado' : 'Deshabilitado'} (personalizado)`
                      }
                    >
                      {enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-gray-500">
        Los permisos del administrador principal y soporte global son irrestrictos y no pueden ser limitados.
        <span className="ml-2 inline-flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded ring-2 ring-amber-400" /> = personalizado (distinto al default del rol)
        </span>
      </p>
    </div>
  );
}
