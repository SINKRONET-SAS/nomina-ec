import os

# Crear TODA la estructura de directorios primero
directorios = [
    'backend/src/config',
    'backend/src/controllers',
    'backend/src/services',
    'backend/src/middleware',
    'backend/src/models',
    'backend/src/templates/contratos',
    'backend/src/templates/actas',
    'backend/src/templates/roles',
    'backend/src/templates/sri',
    'backend/src/utils',
    'frontend-web/src/pages/Empleados',
    'frontend-web/src/pages/Asistencia',
    'frontend-web/src/pages/Nomina',
    'frontend-web/src/pages/Documentos',
    'frontend-web/src/components/Layout',
    'frontend-web/src/components/UI',
    'frontend-web/src/components/Reportes',
    'app-movil/src/screens',
    'app-movil/src/services',
    'docs/formatos_entidades_control'
]

for d in directorios:
    os.makedirs(d, exist_ok=True)

print(f"✓ {len(directorios)} directorios creados")

# Verificar
for d in directorios:
    if os.path.exists(d):
        print(f"  ✓ {d}")
    else:
        print(f"  ✗ {d} - NO EXISTE")
 # Result 
✓ 20 directorios creados
  ✓ backend/src/config
  ✓ backend/src/controllers
  ✓ backend/src/services
  ✓ backend/src/middleware
  ✓ backend/src/models
  ✓ backend/src/templates/contratos
  ✓ backend/src/templates/actas
  ✓ backend/src/templates/roles
  ✓ backend/src/templates/sri
  ✓ backend/src/utils
  ✓ frontend-web/src/pages/Empleados
  ✓ frontend-web/src/pages/Asistencia
  ✓ frontend-web/src/pages/Nomina
  ✓ frontend-web/src/pages/Documentos
  ✓ frontend-web/src/components/Layout
  ✓ frontend-web/src/components/UI
  ✓ frontend-web/src/components/Reportes
  ✓ app-movil/src/screens
  ✓ app-movil/src/services
  ✓ docs/formatos_entidades_control
