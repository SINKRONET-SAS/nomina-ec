# Crear README de forma simple
readme_content = """# PLAN HAIKY - SaaS RRHH Ecuador

Sistema SaaS completo para gestion de Recursos Humanos adaptado a la legislacion ecuatoriana 2026.

## Caracteristicas Principales

### Cumplimiento Legal Ecuador
- Codigo del Trabajo: Registro de jornada (Art. 71), contratos escritos (Art. 18)
- IESS: Calculo automatico de aportes (9.45% personal, 11.15% patronal)
- SRI: Generacion de XML ATS para declaracion de Impuesto a la Renta
- Ministerio del Trabajo: Actas de finiquito con todos los rubros legales

### Multi-Tenant
- Aislamiento completo de datos por empresa (PostgreSQL RLS)
- Configuracion independiente por tenant
- Auditoria completa de todas las operaciones

### App Movil (React Native + Expo)
- Marcacion con foto + GPS obligatorio
- Validacion de perimetro (radio configurable)
- Historial de marcaciones del empleado

### Frontend Web (React + Vite)
- Dashboard con metricas en tiempo real
- Gestion completa de empleados
- Aprobacion de novedades
- Cierre mensual de nomina

### Reglas Irrenunciables (Hardcode)
1. No eliminacion de marcaciones
2. Geolocalizacion obligatoria
3. Devolucion de equipos antes de finiquito
4. Clausula constitucional en contratos
5. Nomina cerrada inmutable
6. Liquidacion minima legal
7. Auditoria obligatoria

## Instalacion

### Backend
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run dev

### Frontend Web
cd frontend-web
npm install
npm run dev

### App Movil
cd app-movil
npm install
npm start

## Estructura del Proyecto

- backend/: API Node.js + Express
- frontend-web/: React + Vite + Tailwind
- app-movil/: React Native + Expo
- docs/: Documentacion

## Seguridad

- JWT para autenticacion
- RLS (Row Level Security) en PostgreSQL
- Cifrado de cuentas bancarias (pgcrypto)
- HTTPS obligatorio
- Auditoria completa

## Reportes Generados

- ATS (XML) para SRI
- SAE (XML) para IESS
- Archivo Bancario (CSV) para bancos
- Rol de Pagos (PDF) para empleados
- Contratos (PDF) para Ministerio
- Actas Finiquito (PDF) para Ministerio

## Calculos Implementados

### Nomina Mensual
- Sueldo basico proporcional
- Horas extras 50% y 100%
- Aporte IESS personal (9.45%)
- Impuesto a la Renta (tabla progresiva 2026)

### Liquidacion
- Sueldo pendiente
- Decimo tercero y cuarto proporcionales
- Vacaciones proporcionales
- Indemnizacion (Art. 188)
- Desahucio (Art. 185)

## Variables de Entorno

PORT=3000
DB_HOST=localhost
DB_NAME=plan_haiky
JWT_SECRET=your-secret-key
AWS_S3_BUCKET=plan-haiky-documents

---

Plan Haiky - Sistema SaaS RRHH Ecuador 2026
"""

with open('README.md', 'w') as f:
    f.write(readme_content)

print("README creado exitosamente")
 # Result 
README creado exitosamente
