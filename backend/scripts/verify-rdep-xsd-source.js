const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'src', 'config', 'rdep', 'rdep-source-manifest.json');

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const xsdSource = manifest.sources.find((source) => source.kind === 'xsd' && source.repositoryPath);

  if (!xsdSource) {
    throw new Error('No existe fuente XSD en rdep-source-manifest.json.');
  }

  const xsdPath = path.join(__dirname, '..', '..', xsdSource.repositoryPath);
  const actualHash = sha256File(xsdPath);
  const expectedHash = String(xsdSource.sha256 || '').toLowerCase();

  if (actualHash !== expectedHash) {
    throw new Error(`El XSD RDEP no coincide con el manifest. Esperado ${expectedHash}, actual ${actualHash}.`);
  }

  const policy = manifest.validationPolicy || {};
  if (policy.xsdValidation !== 'required_before_xml_generation') {
    throw new Error('La politica RDEP debe exigir validacion XSD antes de generar XML.');
  }

  if (!String(policy.officialSourceReconciliation || '').startsWith('checked_')) {
    throw new Error('La reconciliacion oficial RDEP no esta marcada en el manifest.');
  }

  process.stdout.write(JSON.stringify({
    ok: true,
    xsd: xsdSource.repositoryPath,
    sha256: actualHash,
    officialSourceReconciliation: policy.officialSourceReconciliation,
  }, null, 2));
  process.stdout.write('\n');
}

main();
