// RLT26 - calculos de reportes laborales anuales con trazabilidad de origen.

const LABOR_REPORT_CODES = Object.freeze([
  'LABORAL_DECIMO_TERCERO',
  'LABORAL_DECIMO_CUARTO',
  'LABORAL_PARTICIPACION_UTILIDADES',
  'LABORAL_SALARIO_DIGNO',
  'LABORAL_BENEFICIOS_ACUMULADOS',
]);

const LABOR_REPORT_CODE_SET = new Set(LABOR_REPORT_CODES);

function isLaborReportCode(reportCode) {
  return LABOR_REPORT_CODE_SET.has(String(reportCode || '').trim().toUpperCase());
}

function normalizeDetail(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return {};
  }
}

function numberValue(value) {
  const parsed = Number.parseFloat(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundCurrency(value) {
  return Math.round((numberValue(value) + Number.EPSILON) * 100) / 100;
}

function requireNonNegativeFilter(filters, key, label) {
  const raw = filters?.[key];
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    const error = new Error(`Ingresa ${label} para generar este reporte.`);
    error.code = 'REPORTE_LABORAL_PARAMETRO_REQUERIDO';
    error.statusCode = 400;
    error.details = { parameter: key };
    throw error;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    const error = new Error(`${label} debe ser un valor numérico no negativo.`);
    error.code = 'REPORTE_LABORAL_PARAMETRO_INVALIDO';
    error.statusCode = 400;
    error.details = { parameter: key };
    throw error;
  }
  return roundCurrency(parsed);
}

function employeeAccumulator(row = {}) {
  const detail = normalizeDetail(row.detalle_calculo);
  const modalidadDecimoTercero = String(
    detail.decimoTerceroModalidad || row.modalidad_decimo_tercero || 'acumulado',
  ).toLowerCase();
  const modalidadDecimoCuarto = String(
    detail.decimoCuartoModalidad || row.modalidad_decimo_cuarto || 'acumulado',
  ).toLowerCase();

  return {
    empleadoId: row.empleado_id || '',
    cedula: row.cedula || '',
    empleado: `${row.apellidos || ''} ${row.nombres || ''}`.trim(),
    departamento: row.departamento || '',
    cargo: row.cargo || '',
    cargoCodigo: row.cargo_codigo || '',
    unidad: row.unidad_nombre || '',
    centroCosto: row.centro_costo || '',
    diasTrabajados: 0,
    cargasFamiliares: numberValue(row.cargas_familiares),
    totalIngresosRol: 0,
    sueldoBruto: 0,
    provisionDecimoTercero: 0,
    pagadoDecimoTercero: 0,
    provisionDecimoCuarto: 0,
    pagadoDecimoCuarto: 0,
    provisionFondosReserva: 0,
    pagadoFondosReserva: 0,
    provisionVacaciones: 0,
    modalidadDecimoTercero,
    modalidadDecimoCuarto,
    modalidadFondoReserva: String(detail.fondoReservaModalidad || row.modalidad_fondo_reserva || 'mensual').toLowerCase(),
    decimoTerceroAcumulado: 0,
    decimoCuartoAcumulado: 0,
  };
}

function aggregateEmployees(rows = []) {
  const employees = new Map();
  for (const row of rows) {
    const key = row.empleado_id || row.cedula;
    if (!key) continue;
    const detail = normalizeDetail(row.detalle_calculo);
    const current = employees.get(key) || employeeAccumulator(row);
    const provisionDecimoTercero = numberValue(detail.provisionDecimoTercero);
    const pagadoDecimoTercero = numberValue(detail.decimoTerceroMensualizado);
    const provisionDecimoCuarto = numberValue(detail.provisionDecimoCuarto);
    const pagadoDecimoCuarto = numberValue(detail.decimoCuartoMensualizado);
    const provisionFondosReserva = numberValue(detail.provisionFondosReserva);
    const pagadoFondosReserva = numberValue(detail.fondoReservaPagadoEmpleado ?? detail.fondoReservaDepositadoIess);

    current.diasTrabajados += numberValue(row.dias_trabajados);
    current.totalIngresosRol += numberValue(row.total_ingresos);
    current.sueldoBruto += numberValue(row.sueldo_bruto);
    current.provisionDecimoTercero += provisionDecimoTercero;
    current.pagadoDecimoTercero += pagadoDecimoTercero;
    current.provisionDecimoCuarto += provisionDecimoCuarto;
    current.pagadoDecimoCuarto += pagadoDecimoCuarto;
    current.provisionFondosReserva += provisionFondosReserva;
    current.pagadoFondosReserva += pagadoFondosReserva;
    current.provisionVacaciones += numberValue(detail.provisionVacaciones);
    if (current.modalidadDecimoTercero !== 'mensual') current.decimoTerceroAcumulado += provisionDecimoTercero;
    if (current.modalidadDecimoCuarto !== 'mensual') current.decimoCuartoAcumulado += provisionDecimoCuarto;
    employees.set(key, current);
  }
  return [...employees.values()].map((row) => ({
    ...row,
    diasTrabajados: Math.min(360, roundCurrency(row.diasTrabajados)),
    cargasFamiliares: Math.max(0, Math.trunc(row.cargasFamiliares)),
    totalIngresosRol: roundCurrency(row.totalIngresosRol),
    sueldoBruto: roundCurrency(row.sueldoBruto),
    provisionDecimoTercero: roundCurrency(row.provisionDecimoTercero),
    pagadoDecimoTercero: roundCurrency(row.pagadoDecimoTercero),
    provisionDecimoCuarto: roundCurrency(row.provisionDecimoCuarto),
    pagadoDecimoCuarto: roundCurrency(row.pagadoDecimoCuarto),
    provisionFondosReserva: roundCurrency(row.provisionFondosReserva),
    pagadoFondosReserva: roundCurrency(row.pagadoFondosReserva),
    provisionVacaciones: roundCurrency(row.provisionVacaciones),
    decimoTerceroAcumulado: roundCurrency(row.decimoTerceroAcumulado),
    decimoCuartoAcumulado: roundCurrency(row.decimoCuartoAcumulado),
  }));
}

function commonReportRow(row, anio) {
  return {
    periodo: `01/01/${anio} - 31/12/${anio}`,
    cedula: row.cedula,
    empleado: row.empleado,
    departamento: row.departamento,
    cargoCodigo: row.cargoCodigo,
    cargo: row.cargo,
    unidad: row.unidad,
    centroCosto: row.centroCosto,
    diasTrabajados: row.diasTrabajados,
    cargasFamiliares: row.cargasFamiliares,
    provisionMensual: 0,
    pagadoEnRol: 0,
    momentoProvision: 'provision_mensual',
    momentoPago: 'pago_rol',
    observacion: 'Preparación anual; validar período legal y presentación SUT/MDT.',
  };
}

function buildLaborReportRows(rows, reportCode, anio, filters = {}) {
  const normalizedReportCode = String(reportCode || '').trim().toUpperCase();
  if (!isLaborReportCode(normalizedReportCode)) return [];
  const employees = aggregateEmployees(rows);

  if (normalizedReportCode === 'LABORAL_PARTICIPACION_UTILIDADES') {
    const utilidadLiquida = requireNonNegativeFilter(filters, 'utilidadLiquida', 'la utilidad líquida anual');
    const pool = roundCurrency(utilidadLiquida * 0.15);
    const totalDias = employees.reduce((total, row) => total + row.diasTrabajados, 0);
    const totalFactorCargas = employees.reduce((total, row) => total + row.diasTrabajados * row.cargasFamiliares, 0);
    return employees.map((row) => {
      const participacion10 = totalDias > 0 ? roundCurrency(pool * 0.10 * row.diasTrabajados / totalDias) : 0;
      const participacion5 = totalFactorCargas > 0
        ? roundCurrency(pool * 0.05 * (row.diasTrabajados * row.cargasFamiliares) / totalFactorCargas)
        : 0;
      return {
        ...commonReportRow(row, anio),
        utilidadLiquida,
        poolParticipacion: pool,
        participacion10,
        participacion5,
        participacionTotal: roundCurrency(participacion10 + participacion5),
        factorCargasFamiliares: row.diasTrabajados * row.cargasFamiliares,
        observacion: '15% preparado como 10% por días y 5% por cargas familiares; validar bases y período legal.',
      };
    });
  }

  if (normalizedReportCode === 'LABORAL_SALARIO_DIGNO') {
    const salarioDignoMensual = requireNonNegativeFilter(filters, 'salarioDignoMensual', 'el salario digno mensual oficial');
    const fondoCompensacion = requireNonNegativeFilter(
      filters,
      'utilidadCompensacion',
      'la utilidad disponible para compensación de salario digno',
    );
    const prepared = employees.map((row) => {
      const objetivoAnual = roundCurrency(salarioDignoMensual * 12 * row.diasTrabajados / 360);
      const percepcionReportada = roundCurrency(
        row.totalIngresosRol
        + row.decimoTerceroAcumulado
        + row.decimoCuartoAcumulado
        + row.provisionFondosReserva
        + row.provisionVacaciones,
      );
      return {
        ...commonReportRow(row, anio),
        salarioDignoMensual,
        objetivoAnual,
        percepcionReportada,
        brechaAnual: roundCurrency(Math.max(objetivoAnual - percepcionReportada, 0)),
        fondoDisponible: fondoCompensacion,
      };
    });
    const totalBrecha = prepared.reduce((total, row) => total + row.brechaAnual, 0);
    const factorProrrateo = totalBrecha > 0 ? Math.min(1, fondoCompensacion / totalBrecha) : 1;
    return prepared.map((row) => ({
      ...row,
      factorProrrateo: roundCurrency(factorProrrateo),
      compensacionSalarioDigno: roundCurrency(row.brechaAnual * factorProrrateo),
      estadoSalarioDigno: row.brechaAnual === 0
        ? 'sin_brecha'
        : factorProrrateo < 1 ? 'fondo_insuficiente' : 'requiere_compensacion',
      observacion: 'Percepción preparada con roles y provisiones registradas; validar componentes oficiales de salario digno.',
    }));
  }

  return employees.map((row) => {
    const base = commonReportRow(row, anio);
    if (normalizedReportCode === 'LABORAL_DECIMO_TERCERO') {
      return {
        ...base,
        modalidad: row.modalidadDecimoTercero,
        provisionMensual: row.provisionDecimoTercero,
        pagadoEnRol: row.pagadoDecimoTercero,
        valorReportable: roundCurrency(row.provisionDecimoTercero + row.pagadoDecimoTercero),
        concepto: 'Décimo tercero',
      };
    }
    if (normalizedReportCode === 'LABORAL_DECIMO_CUARTO') {
      return {
        ...base,
        modalidad: row.modalidadDecimoCuarto,
        provisionMensual: row.provisionDecimoCuarto,
        pagadoEnRol: row.pagadoDecimoCuarto,
        valorReportable: roundCurrency(row.provisionDecimoCuarto + row.pagadoDecimoCuarto),
        concepto: 'Décimo cuarto',
      };
    }
    return {
      ...base,
      decimoTerceroProvision: row.provisionDecimoTercero,
      decimoTerceroPagoRol: row.pagadoDecimoTercero,
      decimoCuartoProvision: row.provisionDecimoCuarto,
      decimoCuartoPagoRol: row.pagadoDecimoCuarto,
      fondosReservaProvision: row.provisionFondosReserva,
      fondosReservaPagoRol: row.pagadoFondosReserva,
      vacacionesProvision: row.provisionVacaciones,
      valorReportable: roundCurrency(
        row.provisionDecimoTercero
        + row.provisionDecimoCuarto
        + row.provisionFondosReserva
        + row.provisionVacaciones,
      ),
      concepto: 'Beneficios laborales acumulados',
      observacion: 'Distingue provisión mensual de pago en rol; conciliar con el asiento contable y la liquidación legal.',
    };
  });
}

function getLaborReportColumns(reportCode) {
  const normalizedReportCode = String(reportCode || '').trim().toUpperCase();
  const common = [
    { header: 'Periodo del ejercicio', key: 'periodo', width: 25 },
    { header: 'Cédula', key: 'cedula', width: 14 },
    { header: 'Empleado', key: 'empleado', width: 36 },
    { header: 'Departamento', key: 'departamento', width: 20 },
    { header: 'Código cargo', key: 'cargoCodigo', width: 16 },
    { header: 'Cargo', key: 'cargo', width: 24 },
    { header: 'Días trabajados', key: 'diasTrabajados', width: 16 },
    { header: 'Cargas familiares', key: 'cargasFamiliares', width: 18 },
  ];
  if (normalizedReportCode === 'LABORAL_DECIMO_TERCERO' || normalizedReportCode === 'LABORAL_DECIMO_CUARTO') {
    return [
      ...common,
      { header: 'Concepto', key: 'concepto', width: 22 },
      { header: 'Modalidad', key: 'modalidad', width: 16 },
      { header: 'Provisión mensual', key: 'provisionMensual', width: 20, style: { numFmt: '$#,##0.00' } },
      { header: 'Pagado en rol', key: 'pagadoEnRol', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Momento provisión', key: 'momentoProvision', width: 20 },
      { header: 'Momento pago', key: 'momentoPago', width: 16 },
      { header: 'Valor reportable', key: 'valorReportable', width: 20, style: { numFmt: '$#,##0.00' } },
      { header: 'Observación', key: 'observacion', width: 58 },
    ];
  }
  if (normalizedReportCode === 'LABORAL_PARTICIPACION_UTILIDADES') {
    return [
      ...common,
      { header: 'Utilidad líquida base', key: 'utilidadLiquida', width: 22, style: { numFmt: '$#,##0.00' } },
      { header: 'Fondo 15%', key: 'poolParticipacion', width: 16, style: { numFmt: '$#,##0.00' } },
      { header: 'Factor días x cargas', key: 'factorCargasFamiliares', width: 22 },
      { header: 'Participación 10% días', key: 'participacion10', width: 24, style: { numFmt: '$#,##0.00' } },
      { header: 'Participación 5% cargas', key: 'participacion5', width: 24, style: { numFmt: '$#,##0.00' } },
      { header: 'Participación total', key: 'participacionTotal', width: 22, style: { numFmt: '$#,##0.00' } },
      { header: 'Observación', key: 'observacion', width: 58 },
    ];
  }
  if (normalizedReportCode === 'LABORAL_SALARIO_DIGNO') {
    return [
      ...common,
      { header: 'Salario digno mensual', key: 'salarioDignoMensual', width: 24, style: { numFmt: '$#,##0.00' } },
      { header: 'Objetivo anual prorrateado', key: 'objetivoAnual', width: 26, style: { numFmt: '$#,##0.00' } },
      { header: 'Percepción reportada', key: 'percepcionReportada', width: 22, style: { numFmt: '$#,##0.00' } },
      { header: 'Brecha anual', key: 'brechaAnual', width: 18, style: { numFmt: '$#,##0.00' } },
      { header: 'Fondo disponible', key: 'fondoDisponible', width: 20, style: { numFmt: '$#,##0.00' } },
      { header: 'Factor prorrateo', key: 'factorProrrateo', width: 18, style: { numFmt: '0.0000' } },
      { header: 'Compensación preparada', key: 'compensacionSalarioDigno', width: 26, style: { numFmt: '$#,##0.00' } },
      { header: 'Estado', key: 'estadoSalarioDigno', width: 22 },
      { header: 'Observación', key: 'observacion', width: 58 },
    ];
  }
  return [
    ...common,
    { header: 'Décimo tercero provisión', key: 'decimoTerceroProvision', width: 25, style: { numFmt: '$#,##0.00' } },
    { header: 'Décimo tercero pago rol', key: 'decimoTerceroPagoRol', width: 24, style: { numFmt: '$#,##0.00' } },
    { header: 'Décimo cuarto provisión', key: 'decimoCuartoProvision', width: 24, style: { numFmt: '$#,##0.00' } },
    { header: 'Décimo cuarto pago rol', key: 'decimoCuartoPagoRol', width: 23, style: { numFmt: '$#,##0.00' } },
    { header: 'Fondos reserva provisión', key: 'fondosReservaProvision', width: 25, style: { numFmt: '$#,##0.00' } },
    { header: 'Fondos reserva pago rol', key: 'fondosReservaPagoRol', width: 24, style: { numFmt: '$#,##0.00' } },
    { header: 'Vacaciones provisión', key: 'vacacionesProvision', width: 22, style: { numFmt: '$#,##0.00' } },
    { header: 'Valor reportable', key: 'valorReportable', width: 20, style: { numFmt: '$#,##0.00' } },
    { header: 'Momento provisión', key: 'momentoProvision', width: 20 },
    { header: 'Momento pago', key: 'momentoPago', width: 16 },
    { header: 'Observación', key: 'observacion', width: 58 },
  ];
}

module.exports = {
  LABOR_REPORT_CODES,
  isLaborReportCode,
  buildLaborReportRows,
  getLaborReportColumns,
  normalizeDetail,
};
