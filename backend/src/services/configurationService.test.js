jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./auditService', () => ({
  recordAudit: jest.fn(),
}));

const db = require('../config/database');
const { recordAudit } = require('./auditService');
const {
  ONBOARDING_STEPS,
  RESOURCE_CONFIG,
  createResource,
  deleteResource,
  updateResource,
  loadMandatoryLegalParameters,
  syncLegalParametersFromGlobal,
  listResource,
} = require('./configurationService');
const { PAYROLL_CONCEPTS } = require('./payrollAccountingService');

const ownerUser = {
  id: 'user-1',
  tenantId: '11111111-1111-1111-1111-111111111111',
  rol: 'owner',
};

const adminUser = {
  id: 'user-2',
  tenantId: ownerUser.tenantId,
  rol: 'admin_rrhh',
};

describe('configurationService metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('define recursos obligatorios de parametrizacion', () => {
    expect(Object.keys(RESOURCE_CONFIG)).toEqual(expect.arrayContaining([
      'legalParameters',
      'noveltyTypes',
      'organizationUnits',
      'jobPositions',
      'workZones',
      'workShifts',
      'payrollAccountingMappings',
      'bankProfiles',
    ]));
  });

  test('define checklist operativo minimo para OWNER', () => {
    expect(ONBOARDING_STEPS.map((step) => step.code)).toEqual([
      'empresa',
      'legal',
      'organizacion',
      'cargos',
      'jornadas',
      'zonas',
      'novedades',
      'contabilidad',
      'bancos',
      'usuarios',
    ]);
  });

  test('listResource deduplica tipos de novedad por codigo normalizado y prefiere tenant', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'tenant-novelty',
        tenant_id: ownerUser.tenantId,
        code: 'atraso',
        name: 'Atraso tenant',
      }],
    });

    const result = await listResource('noveltyTypes', ownerUser);

    expect(result).toEqual([expect.objectContaining({
      id: 'tenant-novelty',
      code: 'atraso',
    })]);
    expect(db.query.mock.calls[0][0]).toContain('DISTINCT ON (LOWER(BTRIM(code)))');
    expect(db.query.mock.calls[0][0]).toContain('CASE WHEN tenant_id = $1 THEN 0 ELSE 1 END');
    expect(db.query.mock.calls[0][1]).toEqual([ownerUser.tenantId]);
  });

  test.each(PAYROLL_CONCEPTS.map((concept, index) => ({ ...concept, testIndex: index })))(
    'updateResource persiste cuentas personalizadas para $code',
    async (concept) => {
      const debitAccountCode = `6${String(concept.testIndex).padStart(5, '0')}`;
      const creditAccountCode = `2${String(concept.testIndex).padStart(5, '0')}`;
      const previous = {
        id: `mapping-${concept.code}`,
        tenant_id: ownerUser.tenantId,
        concept_code: concept.code,
        concept_label: concept.label,
        category: concept.category,
        entry_type: concept.entryType,
        debit_account_code: concept.debitAccountCode,
        debit_account_name: concept.debitAccountName,
        credit_account_code: concept.creditAccountCode,
        credit_account_name: concept.creditAccountName,
        cost_center_mode: 'employee',
        fixed_cost_center_code: '',
        requires_employee_breakdown: true,
        status: 'activo',
        valid_from: '2026-01-01',
        valid_to: null,
      };
      const updated = {
        ...previous,
        debit_account_code: debitAccountCode,
        debit_account_name: `${concept.label} debe personalizado`,
        credit_account_code: creditAccountCode,
        credit_account_name: `${concept.label} haber personalizado`,
      };
      db.query
        .mockResolvedValueOnce({ rows: [previous] })
        .mockResolvedValueOnce({ rows: [updated] });
      recordAudit.mockResolvedValueOnce();

      const result = await updateResource('payrollAccountingMappings', previous.id, {
        concept_code: concept.code,
        concept_label: concept.label,
        category: concept.category,
        entry_type: concept.entryType,
        debit_account_code: updated.debit_account_code,
        debit_account_name: updated.debit_account_name,
        credit_account_code: updated.credit_account_code,
        credit_account_name: updated.credit_account_name,
        cost_center_mode: 'employee',
        fixed_cost_center_code: '',
        requires_employee_breakdown: true,
        status: 'activo',
        valid_from: '2026-01-01',
        valid_to: '',
      }, ownerUser, { correlationId: `accounting-update-${concept.code}` });

      expect(result).toMatchObject({
        concept_code: concept.code,
        debit_account_code: debitAccountCode,
        credit_account_code: creditAccountCode,
      });
      expect(db.query.mock.calls[1][0]).toContain('UPDATE payroll_accounting_mappings');
      expect(db.query.mock.calls[1][1]).toEqual(expect.arrayContaining([
        concept.code,
        concept.label,
        concept.category,
        debitAccountCode,
        creditAccountCode,
        previous.id,
        ownerUser.tenantId,
      ]));
      expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'configuracion.actualizar',
        entity: 'payroll_accounting_mappings',
        entityId: previous.id,
      }));
    }
  );

  test('updateResource persiste cuentas de conceptos dinamicos de novedades', async () => {
    const previous = {
      id: 'mapping-novedad-bono-cliente',
      tenant_id: ownerUser.tenantId,
      concept_code: 'novedad_bono_cliente',
      concept_label: 'Bono especial de cliente',
      category: 'ingreso',
      entry_type: 'DEVENGAMIENTO',
      debit_account_code: '510190',
      debit_account_name: 'Bonos especiales',
      credit_account_code: '210101',
      credit_account_name: 'Nomina por pagar',
      cost_center_mode: 'employee',
      fixed_cost_center_code: '',
      requires_employee_breakdown: true,
      status: 'activo',
      valid_from: '2026-01-01',
      valid_to: null,
    };
    const updated = {
      ...previous,
      debit_account_code: '510191',
      debit_account_name: 'Bonos especiales personalizados',
      credit_account_code: '210191',
      credit_account_name: 'Bonos especiales por pagar',
    };
    db.query
      .mockResolvedValueOnce({ rows: [previous] })
      .mockResolvedValueOnce({ rows: [updated] });
    recordAudit.mockResolvedValueOnce();

    const result = await updateResource('payrollAccountingMappings', previous.id, {
      concept_code: previous.concept_code,
      concept_label: previous.concept_label,
      category: previous.category,
      entry_type: previous.entry_type,
      debit_account_code: updated.debit_account_code,
      debit_account_name: updated.debit_account_name,
      credit_account_code: updated.credit_account_code,
      credit_account_name: updated.credit_account_name,
      cost_center_mode: 'employee',
      fixed_cost_center_code: '',
      requires_employee_breakdown: true,
      status: 'activo',
      valid_from: '2026-01-01',
      valid_to: '',
    }, ownerUser, { correlationId: 'accounting-update-dynamic-novelty' });

    expect(result).toMatchObject({
      concept_code: 'novedad_bono_cliente',
      concept_label: 'Bono especial de cliente',
      category: 'ingreso',
      debit_account_code: '510191',
      credit_account_code: '210191',
    });
    expect(db.query.mock.calls[1][1]).toEqual(expect.arrayContaining([
      'novedad_bono_cliente',
      'Bono especial de cliente',
      'ingreso',
      '510191',
      '210191',
    ]));
  });

  test('updateResource persiste cuentas editadas para decimo tercero mensualizado', async () => {
    const previous = {
      id: 'mapping-decimo-tercero-mensual',
      tenant_id: ownerUser.tenantId,
      concept_code: 'decimo_tercero_mensual',
      concept_label: 'Decimo tercero mensualizado',
      category: 'ingreso',
      entry_type: 'DEVENGAMIENTO',
      debit_account_code: '510202',
      debit_account_name: 'Gasto decimo tercero',
      credit_account_code: '210101',
      credit_account_name: 'Nomina por pagar',
      cost_center_mode: 'employee',
      fixed_cost_center_code: '',
      requires_employee_breakdown: true,
      status: 'activo',
      valid_from: '2026-01-01',
      valid_to: null,
    };
    const updated = {
      ...previous,
      debit_account_code: '510299',
      debit_account_name: 'Gasto decimo tercero personalizado',
      credit_account_code: '210199',
      credit_account_name: 'Decimo tercero por pagar personalizado',
    };
    db.query
      .mockResolvedValueOnce({ rows: [previous] })
      .mockResolvedValueOnce({ rows: [updated] });
    recordAudit.mockResolvedValueOnce();

    const result = await updateResource('payrollAccountingMappings', previous.id, {
      concept_code: previous.concept_code,
      entry_type: previous.entry_type,
      debit_account_code: updated.debit_account_code,
      debit_account_name: updated.debit_account_name,
      credit_account_code: updated.credit_account_code,
      credit_account_name: updated.credit_account_name,
      cost_center_mode: 'employee',
      fixed_cost_center_code: '',
      requires_employee_breakdown: true,
      status: 'activo',
      valid_from: '01/01/2026',
      valid_to: '',
    }, ownerUser, { correlationId: 'accounting-update' });

    expect(result).toMatchObject({
      debit_account_code: '510299',
      credit_account_code: '210199',
    });
    expect(db.query.mock.calls[1][0]).toContain('UPDATE payroll_accounting_mappings');
    expect(db.query.mock.calls[1][1]).toEqual(expect.arrayContaining([
      '510299',
      '210199',
      '2026-01-01',
      previous.id,
      ownerUser.tenantId,
    ]));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'configuracion.actualizar',
      entity: 'payroll_accounting_mappings',
      entityId: previous.id,
    }));
  });

  test('updateResource rechaza fecha contable ambigua antes de consultar la base', async () => {
    await expect(updateResource('payrollAccountingMappings', 'mapping-1', {
      concept_code: 'decimo_tercero_mensual',
      entry_type: 'DEVENGAMIENTO',
      debit_account_code: '510202',
      debit_account_name: 'Gasto decimo tercero',
      credit_account_code: '210101',
      credit_account_name: 'Nomina por pagar',
      valid_from: 'Thu Jan 01',
    }, ownerUser)).rejects.toMatchObject({
      code: 'CONFIG_DATE_INVALID',
      statusCode: 400,
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  test('createResource bloquea tipo de novedad duplicado con mensaje funcional', async () => {
    db.query.mockRejectedValueOnce({
      code: '23505',
      constraint: 'novelty_type_configs_active_code_norm_idx',
    });

    await expect(
      createResource('noveltyTypes', {
        code: ' Atraso ',
        name: 'Atraso',
        payroll_impact: 'descuento',
        calculation_mode: 'minutes_hourly',
      }, ownerUser)
    ).rejects.toMatchObject({
      code: 'NOVELTY_TYPE_CODE_DUPLICATED',
      statusCode: 409,
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('deleteResource elimina parametros legales sin consumo operativo', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '22222222-2222-2222-2222-222222222222',
          tenant_id: ownerUser.tenantId,
          period_year: 2026,
          parameter_key: 'sbu',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [] });
    recordAudit.mockResolvedValueOnce();

    const result = await deleteResource('legalParameters', '22222222-2222-2222-2222-222222222222', ownerUser, {
      correlationId: 'test-corr',
    });

    expect(result).toEqual({
      deleted: true,
      resource: 'legalParameters',
      id: '22222222-2222-2222-2222-222222222222',
    });
    expect(db.query.mock.calls[2][0]).toContain('DELETE FROM legal_parameter_versions');
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'configuracion.eliminar',
      entity: 'legal_parameter_versions',
    }));
  });

  test('admin_rrhh no puede marcar parametros legales como validados por owner', async () => {
    await expect(
      createResource('legalParameters', {
        country_code: 'EC',
        region_code: 'NACIONAL',
        period_year: 2026,
        parameter_key: 'sbu',
        value: { amount: 482 },
        unit: 'USD',
        owner_validated: true,
        notes: 'Validado en parametrizacion',
      }, adminUser)
    ).rejects.toMatchObject({
      code: 'LEGAL_PARAMETER_OWNER_VALIDATION_REQUIRED',
      statusCode: 403,
    });
    expect(db.query).not.toHaveBeenCalled();
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('owner puede guardar parametro legal con check de validacion y trazabilidad', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'legal-sbu',
          tenant_id: ownerUser.tenantId,
          parameter_key: 'sbu',
          validation_status: 'validado_oficial',
          approved_by: ownerUser.id,
        }],
      });
    recordAudit.mockResolvedValueOnce();

    const result = await createResource('legalParameters', {
      country_code: 'EC',
      region_code: 'NACIONAL',
      period_year: 2026,
      parameter_key: 'sbu',
      value: { amount: 482 },
      unit: 'USD',
      owner_validated: true,
      notes: 'Validado por owner',
    }, ownerUser);

    expect(result).toEqual(expect.objectContaining({
      id: 'legal-sbu',
      validation_status: 'validado_oficial',
      approved_by: ownerUser.id,
    }));
    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO legal_parameter_versions');
    expect(db.query.mock.calls[1][0]).toContain('approved_by');
    expect(db.query.mock.calls[1][1]).toContain(ownerUser.id);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'configuracion.crear',
      entity: 'legal_parameter_versions',
    }));
  });

  test('createResource parametriza establecimiento IESS sin valor hardcodeado', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'MICRO',
          nombre: 'Micro',
          empleados_max: 25,
          empresas_max: 1,
          usuarios_max: 3,
          iess_establecimientos_max: 2,
          archivos_bancarios: true,
          reportes_avanzados: false,
          api_access: false,
          app_movil: true,
          rutas_campo: false,
          subscription_estado: 'active',
          subscription_vence_en: '2026-12-31T00:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 'iess-1',
          tenant_id: ownerUser.tenantId,
          catalog_type: 'iess_establecimiento',
          code: '0002',
          name: 'Sucursal norte',
          status: 'activo',
          payload: { codigoEstablecimiento: '0002', principal: true, isPrincipal: true },
        }],
      })
      .mockResolvedValueOnce({ rows: [] });
    recordAudit.mockResolvedValueOnce();

    const result = await createResource('catalogs', {
      catalog_type: 'iess_establecimiento',
      code: '2',
      name: 'Sucursal norte',
      status: 'activo',
      payload: {
        principal: true,
        direccion: 'Av. Norte',
      },
    }, ownerUser);

    expect(result).toEqual(expect.objectContaining({
      id: 'iess-1',
      code: '0002',
      catalog_type: 'iess_establecimiento',
    }));
    expect(db.query.mock.calls[2][0]).toContain('INSERT INTO configuration_catalogs');
    expect(db.query.mock.calls[2][1]).toEqual(expect.arrayContaining(['0002']));
    expect(db.query.mock.calls[2][1]).toEqual(expect.arrayContaining([
      expect.stringContaining('"codigoEstablecimiento":"0002"'),
    ]));
    expect(db.query.mock.calls[3][0]).toContain("'{principal}'");
  });

  test('createResource bloquea establecimiento IESS si supera limite del plan', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'MICRO',
          nombre: 'Micro',
          empleados_max: 25,
          empresas_max: 1,
          usuarios_max: 3,
          iess_establecimientos_max: 1,
          archivos_bancarios: true,
          reportes_avanzados: false,
          api_access: false,
          app_movil: true,
          rutas_campo: false,
          subscription_estado: 'active',
          subscription_vence_en: '2026-12-31T00:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] });

    await expect(
      createResource('catalogs', {
        catalog_type: 'iess_establecimiento',
        code: '3',
        name: 'Sucursal sur',
        status: 'activo',
        payload: { principal: false },
      }, ownerUser)
    ).rejects.toMatchObject({
      code: 'PLAN_IESS_ESTABLISHMENT_LIMIT_REACHED',
      statusCode: 402,
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('admin_rrhh no puede modificar ni eliminar parametro legal ya validado', async () => {
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'legal-sbu',
        tenant_id: adminUser.tenantId,
        validation_status: 'validado_oficial',
      }],
    });

    await expect(
      updateResource('legalParameters', 'legal-sbu', { notes: 'cambio admin' }, adminUser)
    ).rejects.toMatchObject({
      code: 'LEGAL_PARAMETER_OWNER_VALIDATION_REQUIRED',
      statusCode: 403,
    });

    db.query.mockReset();
    db.query.mockResolvedValueOnce({
      rows: [{
        id: 'legal-sbu',
        tenant_id: adminUser.tenantId,
        validation_status: 'validado_oficial',
      }],
    });

    await expect(
      deleteResource('legalParameters', 'legal-sbu', adminUser)
    ).rejects.toMatchObject({
      code: 'LEGAL_PARAMETER_OWNER_VALIDATION_REQUIRED',
      statusCode: 403,
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('createResource crea cargo con rango salarial y unidad activa', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '44444444-4444-4444-4444-444444444444',
          code: 'RRHH',
          status: 'activo',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: '55555555-5555-5555-5555-555555555555',
          tenant_id: ownerUser.tenantId,
          organization_unit_id: '44444444-4444-4444-4444-444444444444',
          code: 'ANALISTA_RRHH',
          name: 'Analista RRHH',
          salary_min: '700.00',
          salary_max: '1200.00',
          status: 'activo',
        }],
      });
    recordAudit.mockResolvedValueOnce();

    const result = await createResource('jobPositions', {
      organizationUnitCode: 'rrhh',
      code: 'analista_rrhh',
      name: 'Analista RRHH',
      salaryMin: '700',
      salaryMax: '1200',
    }, ownerUser);

    expect(result).toMatchObject({
      id: '55555555-5555-5555-5555-555555555555',
      code: 'ANALISTA_RRHH',
      organization_unit_id: '44444444-4444-4444-4444-444444444444',
    });
    expect(db.query.mock.calls[1][0]).toContain('INSERT INTO job_positions');
    expect(db.query.mock.calls[1][1]).toEqual(expect.arrayContaining([
      '44444444-4444-4444-4444-444444444444',
      'ANALISTA_RRHH',
      700,
      1200,
      ownerUser.tenantId,
    ]));
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'configuracion.crear',
      entity: 'job_positions',
    }));
  });

  test('deleteResource bloquea cargo con empleados asociados', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '55555555-5555-5555-5555-555555555555',
          tenant_id: ownerUser.tenantId,
          code: 'ANALISTA_RRHH',
          name: 'Analista RRHH',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 2 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await expect(
      deleteResource('jobPositions', '55555555-5555-5555-5555-555555555555', ownerUser)
    ).rejects.toMatchObject({
      code: 'CONFIG_RESOURCE_IN_USE',
      statusCode: 409,
      details: {
        table: 'job_positions',
        usages: [{ label: 'empleados', count: 2 }],
      },
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });

  test('deleteResource bloquea zona de marcacion con consumos', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: '33333333-3333-3333-3333-333333333333',
          tenant_id: ownerUser.tenantId,
          code: 'MATRIZ',
        }],
      })
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] })
      .mockResolvedValueOnce({ rows: [{ count: 0 }] });

    await expect(
      deleteResource('workZones', '33333333-3333-3333-3333-333333333333', ownerUser)
    ).rejects.toMatchObject({
      code: 'CONFIG_RESOURCE_IN_USE',
      statusCode: 409,
      details: {
        table: 'work_zones',
        usages: [{ label: 'organization_units', count: 1 }],
      },
    });
    expect(recordAudit).not.toHaveBeenCalled();
  });
});

describe('configurationService legal parameter sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('carga parametros obligatorios 2026 con validacion oficial cuando la base esta validada', async () => {
    db.query.mockImplementation((sql, params = []) => {
      const text = String(sql);
      if (text.includes('INSERT INTO legal_parameter_versions')) {
        return Promise.resolve({
          rows: [{
            id: `legal-${params[2]}`,
            tenant_id: params[0],
            period_year: params[1],
            parameter_key: params[2],
            validation_status: params[7],
          }],
        });
      }
      if (text.includes('UPDATE tenant_onboarding_steps')) {
        return Promise.resolve({
          rows: [{
            id: 'onboarding-legal',
            tenant_id: ownerUser.tenantId,
            step_code: 'legal',
            status: 'completado',
          }],
        });
      }
      return Promise.resolve({ rows: [] });
    });
    recordAudit.mockResolvedValue();

    const result = await loadMandatoryLegalParameters(2026, ownerUser, { correlationId: 'corr-legal' });

    expect(result.count).toBeGreaterThan(0);
    expect(result.rows.every((row) => row.validation_status === 'validado_oficial')).toBe(true);
    const insertedStatuses = db.query.mock.calls
      .filter(([sql]) => String(sql).includes('INSERT INTO legal_parameter_versions'))
      .map(([, params]) => params[7]);
    expect(insertedStatuses.length).toBe(result.count);
    expect(insertedStatuses).toEqual(insertedStatuses.map(() => 'validado_oficial'));
  });

  test('owner sincroniza parametros globales hacia su tenant sin carga manual', async () => {
    db.query
      .mockResolvedValueOnce({
        rows: [{
          id: 'global-sbu',
          tenant_id: null,
          country_code: 'EC',
          region_code: 'NACIONAL',
          period_year: 2026,
          parameter_key: 'sbu',
          value: { amount: 470 },
          unit: 'USD',
          rounding_mode: 'half_up_2',
          validation_status: 'validado_oficial',
          source_name: 'Acuerdo ministerial',
          source_url: 'https://www.trabajo.gob.ec/',
          source_date: '2026-01-01',
          valid_from: '2026-01-01',
          notes: 'SBU oficial',
          approved_by: '99999999-9999-9999-9999-999999999999',
          approved_at: '2026-01-02T00:00:00.000Z',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{
          id: 'tenant-sbu',
          tenant_id: ownerUser.tenantId,
          parameter_key: 'sbu',
        }],
      });
    recordAudit.mockResolvedValueOnce();

    const result = await syncLegalParametersFromGlobal(2026, ownerUser, { correlationId: 'corr-sync' });

    expect(result).toEqual(expect.objectContaining({
      periodYear: 2026,
      sourceScope: 'global',
      tenantCount: 1,
      parameterCount: 1,
    }));
    expect(db.query.mock.calls[1][0]).toContain('ON CONFLICT');
    expect(db.query.mock.calls[1][1][0]).toBe(ownerUser.tenantId);
    expect(recordAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'configuracion.sincronizar_parametros_legales_globales',
      tenantId: ownerUser.tenantId,
    }));
  });
});
