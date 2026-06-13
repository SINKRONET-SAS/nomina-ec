# HNBE26-05 - Asistencia Mobile y PWA

Objetivo: homologar control de asistencia desde Base44 hacia mobile/PWA con trazabilidad operativa.

Tareas:
- Disenar marcacion mobile con entrada, salida, almuerzo, geocerca, distancia, foto opcional, dispositivo y offline queue.
- Definir aprobacion de novedades: atrasos, faltas, permisos, vacaciones, enfermedad IESS, maternidad y paternidad.
- Definir vista PWA/RRHH para revisar marcaciones, alertas y aprobaciones.
- Integrar asistencia al motor de nomina sin recalculos silenciosos.
- Validar permisos por rol y plan.

No hacer:
- No usar geolocalizacion sin consentimiento/trazabilidad LOPDP.
- No marcar asistencia como valida si queda fuera de perimetro sin decision explicita.