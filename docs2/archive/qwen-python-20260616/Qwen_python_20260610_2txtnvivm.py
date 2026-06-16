# Crear package.json del backend
package_json = """{
  "name": "plan-haiky-backend",
  "version": "1.0.0",
  "description": "SaaS RRHH Ecuador - Backend API",
  "main": "src/app.js",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "db:migrate": "node src/config/migrate.js",
    "cron:start": "node src/config/cron-jobs.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2",
    "pg": "^8.11.3",
    "pg-pool": "^3.6.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "dotenv": "^16.3.1",
    "aws-sdk": "^2.1502.0",
    "multer": "^1.4.5-lts.1",
    "docx-templates": "^4.11.4",
    "pdfmake": "^0.2.8",
    "exceljs": "^4.4.0",
    "fast-xml-parser": "^4.3.2",
    "node-cron": "^3.0.3",
    "express-validator": "^7.0.1",
    "morgan": "^1.10.0",
    "winston": "^3.11.0",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0"
  }
}
"""

with open('backend/package.json', 'w') as f:
    f.write(package_json)

# Crear .env de ejemplo
env_example = """# ============================================================
# PLAN HAIKY - Variables de Entorno
# ============================================================

# Servidor
PORT=3000
NODE_ENV=development

# Base de Datos PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=plan_haiky
DB_USER=postgres
DB_PASSWORD=postgres
DB_SSL=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# AWS S3 / DigitalOcean Spaces
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=plan-haiky-documents
AWS_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com

# App
APP_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Configuración por defecto
DEFAULT_RADIO_METROS=100
DEFAULT_JORNADA_HORAS=8
DEFAULT_TOLERANCIA_MIN=5
"""

with open('backend/.env.example', 'w') as f:
    f.write(env_example)

print("✓ package.json y .env.example creados")
 # Result 
✓ package.json y .env.example creados
