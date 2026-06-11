import os

# Recrear estructura de directorios completa
project_structure = {
    'backend/src/config': ['database.js', 's3.js', 'cron-jobs.js', 'schema.sql'],
    'backend/src/controllers': ['authController.js', 'empleadoController.js', 'marcacionController.js', 'novedadController.js', 'nominaController.js', 'documentoLegalController.js', 'reporteController.js'],
    'backend/src/services': ['calculoNominaService.js', 'liquidacionService.js', 'marcacionValidator.js', 'templateGenerator.js', 'sriAtsGenerator.js', 'iessSaeGenerator.js', 'bancoAebGenerator.js'],
    'backend/src/middleware': ['auth.js', 'tenantResolver.js', 'reglasIrrenunciables.js'],
    'backend/src/models': ['Empleado.js', 'Marcacion.js', 'Novedad.js', 'Nomina.js'],
    'backend/src/templates/contratos': [],
    'backend/src/templates/actas': [],
    'backend/src/templates/roles': [],
    'backend/src/templates/sri': [],
    'backend/src/utils': ['validarCedula.js', 'calculoIess.js', 'calculoIrEcuador.js', 'numeroALetras.js'],
    'frontend-web/src/pages/Empleados': [],
    'frontend-web/src/pages/Asistencia': [],
    'frontend-web/src/pages/Nomina': [],
    'frontend-web/src/pages/Documentos': [],
    'frontend-web/src/components/Layout': [],
    'frontend-web/src/components/UI': [],
    'frontend-web/src/components/Reportes': [],
    'app-movil/src/screens': [],
    'app-movil/src/services': [],
    'docs/formatos_entidades_control': []
}

for path, files in project_structure.items():
    os.makedirs(path, exist_ok=True)

print("✓ Estructura de directorios recreada")
print(f"Total de directorios: {len(project_structure)}")
 # Result 
✓ Estructura de directorios recreada
Total de directorios: 20
