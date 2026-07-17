import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, FileText, HelpCircle, Settings2 } from 'lucide-react';
import { authenticatedApi } from '../services/authenticatedApi';

const sections = [
  {
    title: 'Configuración inicial',
    icon: Settings2,
    items: [
      'Registra datos de empresa, representante legal, cargos, jornadas, zonas y banco antes de operar nómina.',
      'El administrador principal valida parámetros legales con el check de responsabilidad. Luego solo el administrador principal o soporte global puede modificarlos.',
      'En cada cargo define la plantilla de contrato que debe sugerirse al generar documentos laborales.',
    ],
  },
  {
    title: 'Períodos de nómina',
    icon: CheckCircle2,
    items: [
      'Genera el año para crear meses desde el 1 de enero hasta el 31 de diciembre.',
      'Si la empresa inicia operación en un mes posterior, cierra los meses anteriores vacíos desde Períodos.',
      'Edita fechas solo antes de calcular roles o registrar datos operativos en el período.',
    ],
  },
  {
    title: 'Contratos y documentos',
    icon: FileText,
    items: [
      'Escoge el modelo de contrato en la ficha del empleado; cambia la plantilla al emitir PDF solo cuando exista justificación y soporte.',
      'Adjunta contrato firmado, aviso de entrada IESS, actas de dotación y otros documentos desde la ficha del empleado.',
      'Registra externamente en SUT/IESS cuando corresponda; la empresa conserva evidencia en su expediente y el sistema no reemplaza portales oficiales.',
    ],
  },
  {
    title: 'Nómina y novedades',
    icon: BookOpen,
    items: [
      'Aprueba permisos, horas extra, anticipos, préstamos y novedades antes de calcular el mes.',
      'Revisa roles individuales, reportes consolidados, pagos bancarios y notificaciones antes de cerrar.',
      'No cierres un período con novedades pendientes o datos de soporte incompletos.',
    ],
  },
];

function AyudaUsuario() {
  const { data: contractTypes = [], isLoading: loadingContractTypes, isError: contractTypesError } = useQuery({
    queryKey: ['ayuda', 'contrato-tipos-ecuador'],
    queryFn: async () => {
      const response = await authenticatedApi.get('/documentos/contrato/tipos-ecuador');
      return response.data.contractTypes || [];
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <HelpCircle className="mt-1 h-6 w-6 text-teal-700" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-800">Ayuda del usuario</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950">Guía operativa SKNOMINA</h1>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              Usa esta guía como lista corta de control antes de parametrizar, contratar, calcular o cerrar nómina.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm" key={section.title}>
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-teal-700" />
                <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <li className="flex gap-2 text-sm leading-6 text-slate-700" key={item}>
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-teal-700" />
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Tipos de contrato aceptados para Ecuador</h2>
            <p className="mt-1 text-sm text-slate-600">Referencia operativa para seleccionar la modalidad aplicable y revisar su soporte laboral.</p>
          </div>
        </div>
        {loadingContractTypes && <p className="mt-4 text-sm text-slate-500">Cargando catálogo...</p>}
        {contractTypesError && <p className="mt-4 text-sm text-red-700">No se pudo cargar el catálogo. Reintenta o consulta al administrador.</p>}
        {!loadingContractTypes && !contractTypesError && (
          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {contractTypes.map((type) => (
              <div className="rounded-md bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700" key={type.code}>
                <p className="font-semibold text-slate-950">{type.label}</p>
                <p>{type.basis}</p>
                <p className="mt-1">{type.operationalUse}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default AyudaUsuario;
