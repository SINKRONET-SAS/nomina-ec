// ============================================================
// SKNOMINA - Middleware de Reglas Irrenunciables
// Estas reglas NO PUEDEN ser desactivadas por ningún cliente
// ============================================================

/**
 * Regla 1: No permitir eliminación de marcaciones
 * Las marcaciones solo pueden anularse con una nueva marcación correctiva
 */
const noEliminarMarcaciones = (req, res, next) => {
  if (req.method === 'DELETE' && req.path.includes('/marcaciones')) {
    return res.status(403).json({
      error: 'VIOLACION_REGLA_IRRENUNCIABLE',
      message: 'No se pueden eliminar marcaciones. Regla irrenunciable Art. 71 Código del Trabajo. Solo se puede anular con marcación correctiva.',
    });
  }
  next();
};

/**
 * Regla 2: Geolocalización obligatoria en marcaciones
 */
const geolocalizacionObligatoria = (req, res, next) => {
  if (req.path.includes('/marcaciones') && req.method === 'POST') {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'VIOLACION_REGLA_IRRENUNCIABLE',
        message: 'La geolocalización es obligatoria para registrar marcaciones. Regla irrenunciable.',
      });
    }
  }
  next();
};

/**
 * Regla 3: No modificar nómina cerrada
 */
const noModificarNominaCerrada = (req, res, next) => {
  if (req.method === 'PUT' && req.path.includes('/nomina')) {
    // Esta validación se hace también a nivel de DB con trigger
    // Aquí es una validación adicional
    return next(); // Se maneja en el trigger de PostgreSQL
  }
  next();
};

/**
 * Regla 4: Cláusula irrenunciable en contratos
 * Se valida en el servicio de generación de documentos
 */
const clausulaIrrenunciableContrato = (req, res, next) => {
  if (req.path.includes('/documentos/contrato') && req.method === 'POST') {
    // El servicio se encargará de inyectar la cláusula
    // No se puede subir un template sin la cláusula
    req.clausulaIrrenunciable = true;
  }
  next();
};

/**
 * Regla 5: Validación de liquidación mínima legal
 */
const liquidacionMinimaLegal = (req, res, next) => {
  if (req.path.includes('/documentos/finiquito') && req.method === 'POST') {
    // El servicio validará que la liquidación sea >= al mínimo legal
    req.validarLiquidacionMinima = true;
  }
  next();
};

/**
 * Regla 6: Devolución de equipos antes de finiquito
 */
const devolucionEquiposObligatoria = (req, res, next) => {
  if (req.path.includes('/documentos/finiquito') && req.method === 'POST') {
    // El servicio validará que existan actas de devolución
    req.validarDevolucionEquipos = true;
  }
  next();
};

/**
 * Aplicar todas las reglas irrenunciables
 */
const aplicarTodas = [
  noEliminarMarcaciones,
  geolocalizacionObligatoria,
  noModificarNominaCerrada,
  clausulaIrrenunciableContrato,
  liquidacionMinimaLegal,
  devolucionEquiposObligatoria,
];

module.exports = {
  noEliminarMarcaciones,
  geolocalizacionObligatoria,
  noModificarNominaCerrada,
  clausulaIrrenunciableContrato,
  liquidacionMinimaLegal,
  devolucionEquiposObligatoria,
  aplicarTodas,
};


