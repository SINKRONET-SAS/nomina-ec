export const DEFAULT_CONTRACT_TEMPLATE_KEY = 'contrato_indefinido_general';

const CONTRACT_TEMPLATE_ALIASES = {
  indefinido: DEFAULT_CONTRACT_TEMPLATE_KEY,
  contrato_indefinido: DEFAULT_CONTRACT_TEMPLATE_KEY,
  general: DEFAULT_CONTRACT_TEMPLATE_KEY,
  prueba: 'contrato_indefinido_mercaderista_prueba',
  contrato_prueba: 'contrato_indefinido_mercaderista_prueba',
  indefinido_mercaderista_prueba: 'contrato_indefinido_mercaderista_prueba',
  ocasional: 'contrato_ocasional',
  eventual: 'contrato_eventual',
  temporada: 'contrato_temporada',
  obra: 'contrato_obra_cierta',
  obra_cierta: 'contrato_obra_cierta',
  obra_servicio_giro_negocio: 'contrato_obra_servicio_giro_negocio',
  tarea: 'contrato_por_tarea',
  destajo: 'contrato_a_destajo',
  teletrabajo: 'contrato_teletrabajo',
  jornada_parcial_permanente: 'contrato_jornada_parcial_permanente',
  productivo: 'contrato_productivo',
  especial_emergente: 'contrato_especial_emergente',
  emprendimiento: 'contrato_emprendimiento',
  turistico_cultural_creativo: 'contrato_turistico_cultural_creativo',
  aprendizaje: 'contrato_aprendizaje',
  trabajo_juvenil: 'contrato_trabajo_juvenil',
};

function normalizeCode(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

function templateKeySet(templates = []) {
  return new Set(templates.map((template) => template.templateKey).filter(Boolean));
}

export function normalizeContractTemplateKey(value, templates = [], fallback = DEFAULT_CONTRACT_TEMPLATE_KEY) {
  const normalized = normalizeCode(value);
  if (!normalized) return fallback;

  const availableKeys = templateKeySet(templates);
  if (availableKeys.has(normalized)) return normalized;

  const alias = CONTRACT_TEMPLATE_ALIASES[normalized];
  if (alias && (availableKeys.size === 0 || availableKeys.has(alias))) return alias;

  if (normalized.startsWith('contrato_') && availableKeys.size === 0) return normalized;
  return fallback;
}

export function contractTemplateOptionLabel(template) {
  const version = template.version ? ` v${template.version}` : '';
  return `${template.displayName || template.templateKey}${version}`;
}
