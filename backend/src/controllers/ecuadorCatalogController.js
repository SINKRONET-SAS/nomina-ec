const db = require('../config/database');

async function provincias(req, res, next) {
  try {
    const result = await db.query(`
      SELECT code, name, region
      FROM ecuador_provinces
      WHERE active = true
      ORDER BY name
    `);
    return res.json({ data: result.rows, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

async function ciudades(req, res, next) {
  try {
    const provinceCode = String(req.query.provinceCode || '').trim();
    const params = [];
    let where = 'WHERE active = true';
    if (provinceCode) {
      params.push(provinceCode);
      where += ' AND province_code = $1';
    }
    const result = await db.query(`
      SELECT code, province_code, name
      FROM ecuador_cities
      ${where}
      ORDER BY name
    `, params);
    return res.json({ data: result.rows, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  provincias,
  ciudades,
};
