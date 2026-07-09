// ============================================================
// SKNOMINA - Causales laborales Ecuador para finiquito
// ============================================================

const TERMINATION_CAUSES = [
  {
    code: 'renuncia_voluntaria',
    label: 'Renuncia voluntaria con desahucio',
    group: 'Trabajador',
    legalBasis: 'Codigo del Trabajo Arts. 184 y 185',
    canGenerateSettlement: true,
    paysDesahucioBonus: true,
    paysIntempestiveDismissal: false,
  },
  {
    code: 'desahucio',
    label: 'Desahucio presentado por el trabajador',
    group: 'Trabajador',
    legalBasis: 'Codigo del Trabajo Arts. 169.9, 184 y 185',
    canGenerateSettlement: true,
    paysDesahucioBonus: true,
    paysIntempestiveDismissal: false,
  },
  {
    code: 'mutuo_acuerdo',
    label: 'Acuerdo entre las partes',
    group: 'Acuerdo',
    legalBasis: 'Codigo del Trabajo Arts. 169.2, 184 y 185',
    canGenerateSettlement: true,
    paysDesahucioBonus: true,
    paysIntempestiveDismissal: false,
  },
  {
    code: 'despido_intempestivo',
    label: 'Despido intempestivo',
    group: 'Empleador',
    legalBasis: 'Codigo del Trabajo Art. 188, sin perjuicio de Art. 185',
    canGenerateSettlement: true,
    paysDesahucioBonus: true,
    paysIntempestiveDismissal: true,
  },
  {
    code: 'periodo_prueba_unilateral_empleador',
    label: 'Periodo de prueba: terminacion unilateral del empleador',
    group: 'Periodo de prueba',
    legalBasis: 'Codigo del Trabajo Art. 15',
    canGenerateSettlement: true,
    paysDesahucioBonus: false,
    paysIntempestiveDismissal: false,
    requiresProbationPeriod: true,
    maxProbationDays: 90,
  },
  {
    code: 'periodo_prueba_unilateral_trabajador',
    label: 'Periodo de prueba: terminacion unilateral del trabajador',
    group: 'Periodo de prueba',
    legalBasis: 'Codigo del Trabajo Art. 15',
    canGenerateSettlement: true,
    paysDesahucioBonus: false,
    paysIntempestiveDismissal: false,
    requiresProbationPeriod: true,
    maxProbationDays: 90,
  },
  {
    code: 'conclusion_obra_servicio',
    label: 'Conclusion de obra, periodo o servicio',
    group: 'Contrato',
    legalBasis: 'Codigo del Trabajo Art. 169.3',
    canGenerateSettlement: true,
    paysDesahucioBonus: false,
    paysIntempestiveDismissal: false,
  },
  {
    code: 'visto_bueno_empleador',
    label: 'Visto bueno solicitado por el empleador',
    group: 'Visto bueno',
    legalBasis: 'Codigo del Trabajo Arts. 169.7, 172 y 183',
    canGenerateSettlement: false,
    requiresAuthorityApproval: true,
    disabledReason: 'Requiere resolucion de visto bueno antes de generar finiquito automatico.',
  },
  {
    code: 'visto_bueno_trabajador',
    label: 'Visto bueno solicitado por el trabajador',
    group: 'Visto bueno',
    legalBasis: 'Codigo del Trabajo Arts. 169.8, 173, 183 y 191',
    canGenerateSettlement: false,
    requiresAuthorityApproval: true,
    disabledReason: 'Requiere resolucion de visto bueno y revision de indemnizaciones antes del calculo automatico.',
  },
  {
    code: 'caso_fortuito_fuerza_mayor',
    label: 'Caso fortuito o fuerza mayor',
    group: 'Revision legal',
    legalBasis: 'Codigo del Trabajo Art. 169.6',
    canGenerateSettlement: false,
    requiresManualReview: true,
    disabledReason: 'Requiere sustento legal documentado y revision previa de RRHH/legal.',
  },
  {
    code: 'muerte_o_incapacidad_total_trabajador',
    label: 'Muerte o incapacidad permanente total del trabajador',
    group: 'Revision legal',
    legalBasis: 'Codigo del Trabajo Art. 169.5',
    canGenerateSettlement: false,
    requiresManualReview: true,
    disabledReason: 'Requiere expediente y revision legal antes de emitir liquidacion.',
  },
];

const TERMINATION_CAUSE_BY_CODE = new Map(TERMINATION_CAUSES.map((cause) => [cause.code, cause]));

function listTerminationCauses() {
  return TERMINATION_CAUSES.map((cause) => ({ ...cause }));
}

function getTerminationCause(code) {
  return TERMINATION_CAUSE_BY_CODE.get(String(code || '').trim()) || null;
}

function assertTerminationCause(code) {
  const cause = getTerminationCause(code);
  if (!cause) {
    const err = new Error('La causal de terminacion no esta homologada para Ecuador.');
    err.code = 'TERMINACION_CAUSAL_INVALIDA';
    err.statusCode = 422;
    throw err;
  }

  if (!cause.canGenerateSettlement) {
    const err = new Error(cause.disabledReason || 'La causal requiere revision previa antes de generar finiquito automatico.');
    err.code = 'TERMINACION_CAUSAL_REQUIERE_REVISION';
    err.statusCode = 422;
    err.details = { cause };
    throw err;
  }

  return cause;
}

module.exports = {
  TERMINATION_CAUSES,
  listTerminationCauses,
  getTerminationCause,
  assertTerminationCause,
};
