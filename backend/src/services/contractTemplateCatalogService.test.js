jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const {
  normalizeParameterValues,
  normalizeParameterSchema,
} = require('./contractTemplateCatalogService');

describe('contractTemplateCatalogService', () => {
  test('expone una lista blanca de parámetros contractuales seguros', () => {
    const template = { templateKey: 'contrato_demo' };
    const schema = normalizeParameterSchema(template);
    const values = normalizeParameterValues(template, {
      'contract.serviceDescription': 'Servicio parametrizado',
      'contract.workCity': 'Quito',
    });

    expect(schema.map((item) => item.path)).toContain('contract.serviceDescription');
    expect(values).toEqual({
      'contract.serviceDescription': 'Servicio parametrizado',
      'contract.workCity': 'Quito',
    });
  });

  test('rechaza variables no declaradas y contenido fuera de la lista blanca', () => {
    expect(() => normalizeParameterValues({ templateKey: 'contrato_demo' }, {
      'company.legalName': '<script>alert(1)</script>',
    })).toThrow(expect.objectContaining({
      code: 'CONTRATO_PARAMETROS_INVALIDOS',
      statusCode: 422,
    }));
  });
});
