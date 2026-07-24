// ============================================================
// SKNOMINA - Cabecera y pie de firma compartidos para PDFs
// ============================================================

function cleanText(value, fallback = '') {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  return text || fallback;
}

const PDF_LOGO_WIDTH = 120;

function normalizeConfig(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (err) {
    return {};
  }
}

function resolveCompanyData(tenantOrRow) {
  const config = normalizeConfig(
    tenantOrRow.tenant_configuracion
      || tenantOrRow.configuracion
      || tenantOrRow.config
  );

  return {
    ruc: cleanText(tenantOrRow.ruc || config.ruc, 'no registrado'),
    razonSocial: cleanText(
      tenantOrRow.razon_social
        || tenantOrRow.razonSocial
        || config.razonSocial
        || config.razon_social,
      'Empresa'
    ),
    nombreComercial: cleanText(
      tenantOrRow.nombre_comercial
        || tenantOrRow.nombreComercial
        || config.nombreComercial
        || config.nombre_comercial
    ),
    representanteLegal: cleanText(
      config.representanteLegal
        || config.representante_legal
        || config.legalRepresentative
        || tenantOrRow.representante_legal,
      'Representante legal/delegado autorizado'
    ),
    representanteLegalCargo: cleanText(
      config.representanteLegalCargo
        || config.representante_legal_cargo
        || config.legalRepresentativeTitle,
      'Representante legal / delegado del empleador'
    ),
    representanteLegalId: cleanText(
      config.representanteLegalIdentificacion
        || config.representante_legal_identificacion
        || config.legalRepresentativeId
        || config.cedulaRepresentanteLegal,
      'no registrada'
    ),
    logoBase64: config.logoBase64 || null,
  };
}

function buildPdfHeader({ title, company, period = '', isDraft = false, extraSubtitle = '' }) {
  const content = [];

  if (company.logoBase64) {
    content.push({
      columns: [
        {
          image: company.logoBase64,
          width: PDF_LOGO_WIDTH,
          margin: [0, 0, 0, 6],
        },
        {
          stack: [
            { text: title, style: 'title' },
            ...(isDraft ? [{
              text: 'BORRADOR - NO CONSTITUYE COMPROBANTE DE PAGO',
              style: 'draftWarning',
            }] : []),
            { text: company.razonSocial, style: 'subtitle' },
            {
              text: `RUC: ${company.ruc}${period ? ` | Periodo: ${period}` : ''}`,
              style: 'audit',
              alignment: 'center',
              margin: [0, 0, 0, 4],
            },
            ...(extraSubtitle ? [{ text: extraSubtitle, style: 'audit', alignment: 'center' }] : []),
          ],
          alignment: 'center',
          width: '*',
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 14],
    });
  } else {
    content.push({ text: title, style: 'title' });
    if (isDraft) {
      content.push({
        text: 'BORRADOR - NO CONSTITUYE COMPROBANTE DE PAGO',
        style: 'draftWarning',
      });
    }
    content.push({ text: company.razonSocial, style: 'subtitle' });
    content.push({
      text: `RUC: ${company.ruc}${period ? ` | Periodo: ${period}` : ''}`,
      style: 'audit',
      alignment: 'center',
      margin: [0, 0, 0, 14],
    });
    if (extraSubtitle) {
      content.push({ text: extraSubtitle, style: 'audit', alignment: 'center' });
    }
  }

  return content;
}

function buildSignatureBlock({ company, employeeName = '', employeeCedula = '', showEmployeeSignature = true }) {
  const columns = [
    {
      width: '*',
      stack: [
        { text: '\n\n____________________________', alignment: 'center' },
        { text: company.representanteLegal, alignment: 'center', bold: true },
        { text: company.representanteLegalCargo, alignment: 'center' },
        { text: `Identificacion: ${company.representanteLegalId}`, alignment: 'center' },
      ],
    },
  ];

  if (showEmployeeSignature && employeeName) {
    columns.push({
      width: '*',
      stack: [
        { text: '\n\n____________________________', alignment: 'center' },
        { text: employeeName, alignment: 'center', bold: true },
        { text: 'Trabajador', alignment: 'center' },
        { text: `C.C.: ${cleanText(employeeCedula, 'no registrada')}`, alignment: 'center' },
      ],
    });
  }

  return {
    columns,
    columnGap: 26,
    margin: [0, 0, 0, 16],
  };
}

module.exports = {
  PDF_LOGO_WIDTH,
  resolveCompanyData,
  buildPdfHeader,
  buildSignatureBlock,
  cleanText,
  normalizeConfig,
};
