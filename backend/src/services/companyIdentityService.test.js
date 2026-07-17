jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

const db = require('../config/database');
const {
  COMPANY_IDENTITY_SOURCE,
  loadCompanyCatalogPayload,
  resolveCompanyIdentity,
} = require('./companyIdentityService');

describe('companyIdentityService', () => {
  beforeEach(() => jest.clearAllMocks());

  test('prioriza Datos de empresa sobre la configuracion heredada del tenant', async () => {
    const identity = await resolveCompanyIdentity({
      tenantId: 'tenant-1',
      tenantRow: {
        razon_social: 'Empresa heredada',
        configuracion: {
          representanteLegal: 'Representante anterior',
          representanteLegalIdentificacion: '0000000000',
        },
        company_operativa_payload: {
          razonSocial: 'Empresa operativa',
          representanteLegal: 'Veronica Jocelyn Salvador Loza',
          representanteLegalIdentificacion: '1714406954',
        },
      },
    });

    expect(identity).toMatchObject({
      razon_social: 'Empresa operativa',
      representante_legal: 'Veronica Jocelyn Salvador Loza',
      representante_legal_identificacion: '1714406954',
      companyIdentitySource: COMPANY_IDENTITY_SOURCE,
      companyIdentityComplete: true,
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  test('consulta el catalogo cuando el generador lo solicita', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ payload: { representanteLegal: 'Ana', representanteLegalIdentificacion: '1700000001' } }] });

    const payload = await loadCompanyCatalogPayload({ tenantId: 'tenant-1', correlationId: 'corr-1', userId: 'user-1' });

    expect(payload).toEqual({ representanteLegal: 'Ana', representanteLegalIdentificacion: '1700000001' });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("catalog_type = $2"), ['tenant-1', 'empresa_operativa']);
  });
});
