# Crear controlador de autenticación
auth_controller = '''// ============================================================
// PLAN HAIKY - Controlador de Autenticación
// ============================================================
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/auth');
const { validarCedula } = require('../utils/validarCedula');

/**
 * Login de usuario
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }
    
    // Buscar usuario
    const result = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    const usuario = result.rows[0];
    
    // Verificar contraseña
    const validPassword = await bcrypt.compare(password, usuario.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Actualizar último acceso
    await db.query(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = $1',
      [usuario.id]
    );
    
    // Generar token
    const token = generateToken(usuario);
    
    res.json({
      success: true,
      token,
      usuario: {
        id: usuario.id,
        tenantId: usuario.tenant_id,
        email: usuario.email,
        rol: usuario.rol,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
      }
    });
    
  } catch (err) {
    console.error('[AUTH] Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Registro de nuevo usuario (solo admin)
 */
async function register(req, res) {
  try {
    const { tenantId, email, password, rol, nombres, apellidos } = req.body;
    
    // Validaciones
    if (!tenantId || !email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    
    if (!['admin_rrhh', 'supervisor', 'empleado'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }
    
    // Verificar que el email no exista
    const existe = await db.query(
      'SELECT id FROM usuarios WHERE tenant_id = $1 AND email = $2',
      [tenantId, email]
    );
    
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Hashear contraseña
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Crear usuario
    const result = await db.query(`
      INSERT INTO usuarios (tenant_id, email, password_hash, rol, nombres, apellidos)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, tenant_id, email, rol, nombres, apellidos
    `, [tenantId, email, passwordHash, rol, nombres || '', apellidos || '']);
    
    const usuario = result.rows[0];
    
    res.status(201).json({
      success: true,
      usuario: {
        id: usuario.id,
        tenantId: usuario.tenant_id,
        email: usuario.email,
        rol: usuario.rol,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
      }
    });
    
  } catch (err) {
    console.error('[AUTH] Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Refrescar token
 */
async function refreshToken(req, res) {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token requerido' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    
    // Verificar que el usuario aún existe y está activo
    const result = await db.query(
      'SELECT id, tenant_id, email, rol FROM usuarios WHERE id = $1 AND activo = true',
      [decoded.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }
    
    const usuario = result.rows[0];
    const newToken = generateToken(usuario);
    
    res.json({ success: true, token: newToken });
    
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    res.status(403).json({ error: 'Token inválido' });
  }
}

module.exports = { login, register, refreshToken };
'''

with open('backend/src/controllers/authController.js', 'w') as f:
    f.write(auth_controller)

print("✓ Controlador de autenticación creado")
 # Result 
✓ Controlador de autenticación creado
