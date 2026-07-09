const ECUADOR_CONTRACT_TYPES = [
  {
    code: 'indefinido',
    label: 'Tiempo indefinido',
    basis: 'Código del Trabajo Art. 14',
    operationalUse: 'Relación laboral estable o permanente. Puede incluir período de prueba escrito hasta 90 días.',
    requiresWrittenContract: false,
  },
  {
    code: 'obra_cierta',
    label: 'Obra cierta',
    basis: 'Código del Trabajo Art. 16',
    operationalUse: 'Ejecución de una obra determinada por una remuneración que comprende la totalidad de la obra.',
    requiresWrittenContract: true,
  },
  {
    code: 'tarea',
    label: 'Por tarea',
    basis: 'Código del Trabajo Art. 16',
    operationalUse: 'Ejecución de una cantidad de obra o trabajo en una jornada o período previamente establecido.',
    requiresWrittenContract: true,
  },
  {
    code: 'destajo',
    label: 'A destajo',
    basis: 'Código del Trabajo Art. 16',
    operationalUse: 'Trabajo por unidades de obra, piezas, trozos o medidas de superficie.',
    requiresWrittenContract: true,
  },
  {
    code: 'obra_servicio_giro_negocio',
    label: 'Obra o servicio dentro del giro del negocio',
    basis: 'Código del Trabajo Art. 16.1',
    operationalUse: 'Labor o actividad determinada dentro del giro del negocio, con reglas de nuevo llamado.',
    requiresWrittenContract: true,
  },
  {
    code: 'eventual',
    label: 'Eventual',
    basis: 'Código del Trabajo Art. 17',
    operationalUse: 'Exigencias circunstanciales, reemplazos o mayor demanda temporal con límites legales.',
    requiresWrittenContract: true,
  },
  {
    code: 'ocasional',
    label: 'Ocasional',
    basis: 'Código del Trabajo Art. 17',
    operationalUse: 'Necesidades emergentes o extraordinarias no vinculadas a la actividad habitual.',
    requiresWrittenContract: true,
  },
  {
    code: 'temporada',
    label: 'Temporada',
    basis: 'Código del Trabajo Art. 17',
    operationalUse: 'Trabajos cíclicos o periódicos con derecho de llamado en cada temporada.',
    requiresWrittenContract: true,
  },
  {
    code: 'aprendizaje',
    label: 'Aprendizaje',
    basis: 'Código del Trabajo Art. 14 y Art. 19',
    operationalUse: 'Contrato sujeto a reglas especiales y forma escrita.',
    requiresWrittenContract: true,
  },
  {
    code: 'jornada_parcial_permanente',
    label: 'Jornada parcial permanente',
    basis: 'Modalidad especial laboral vigente; validar acuerdo aplicable y SUT',
    operationalUse: 'Relación permanente con jornada inferior a la ordinaria, remuneración proporcional y soporte de jornada.',
    requiresWrittenContract: true,
  },
  {
    code: 'teletrabajo',
    label: 'Teletrabajo',
    basis: 'Régimen de teletrabajo vigente; validar acuerdo aplicable y registro',
    operationalUse: 'Prestación subordinada fuera de instalaciones del empleador, con reglas de desconexión, herramientas y seguridad.',
    requiresWrittenContract: true,
  },
  {
    code: 'trabajo_juvenil',
    label: 'Trabajo juvenil',
    basis: 'Régimen especial de empleo juvenil vigente; validar requisitos y registro',
    operationalUse: 'Contratación de jóvenes bajo condiciones especiales permitidas y documentadas.',
    requiresWrittenContract: true,
  },
  {
    code: 'productivo',
    label: 'Productivo',
    basis: 'Modalidad contractual productiva vigente; validar acuerdo aplicable y causa real',
    operationalUse: 'Contratación para necesidades productivas justificadas con soporte documental.',
    requiresWrittenContract: true,
  },
  {
    code: 'especial_emergente',
    label: 'Especial emergente',
    basis: 'Modalidad especial emergente vigente; validar habilitación normativa y causa',
    operationalUse: 'Respuesta documentada a condiciones emergentes permitidas por la normativa aplicable.',
    requiresWrittenContract: true,
  },
  {
    code: 'emprendimiento',
    label: 'Emprendimiento',
    basis: 'Modalidad especial para emprendimientos; validar acuerdo aplicable y registro',
    operationalUse: 'Contratación vinculada a emprendimientos que cumplen requisitos de la modalidad.',
    requiresWrittenContract: true,
  },
  {
    code: 'turistico_cultural_creativo',
    label: 'Turístico, cultural o creativo',
    basis: 'Modalidad especial sectorial vigente; validar acuerdo aplicable y actividad',
    operationalUse: 'Contratación sectorial para actividades turísticas, culturales o creativas documentadas.',
    requiresWrittenContract: true,
  },
];

const CONTRACT_TYPE_CODES = new Set(ECUADOR_CONTRACT_TYPES.map((type) => type.code));

function listEcuadorContractTypes() {
  return ECUADOR_CONTRACT_TYPES.map((type) => ({ ...type }));
}

function isAcceptedEcuadorContractType(code) {
  return CONTRACT_TYPE_CODES.has(String(code || '').trim());
}

module.exports = {
  ECUADOR_CONTRACT_TYPES,
  isAcceptedEcuadorContractType,
  listEcuadorContractTypes,
};
