# HNBE26-01 - Verificacion Forense

Objetivo: mapear con evidencia directa el prototipo Base44 y la superficie actual de Nomina-Ec antes de disenar o modificar runtime.

Tareas:
- Leer entidades Base44: Empresa, Empleado, Marcacion, NovedadAsistencia, Nomina, BeneficioEmpleado, DocumentoLegal, ParametroLegal, PlanSuscripcion y AuditLog.
- Leer paginas Base44: Dashboard, Empleados, Marcaciones, Novedades, Nomina, Beneficios, Reportes, Empresas, Planes, ParametrosLegales, Configuracion y Perfil.
- Mapear en Nomina-Ec modelos `Workspace`, `Empresa`, `User`, `Plan`, permisos, servicios de planes, mobile y landing.
- Documentar brechas reales y falsos positivos en `docs2/homologacion-nomina-base44-ecuador-2026/REPORTE_HNBE26_01_VERIFICACION.md`.
- Clasificar cada brecha como legal, arquitectura, mobile, PWA, planes, LOPDP, reporterias o deuda.

No hacer:
- No modificar runtime.
- No crear modelos, migraciones, pantallas ni permisos.