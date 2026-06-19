# Reporte EAA26-01 - Auditoria comparativa

## Resultado

Se reviso `C:\proyectos web\sinkroniq-mobile` como referencia funcional y se adapto el patron al dominio laboral de Nomina-Ec. No se copio codigo literalmente.

## Patrones reutilizados

- Codigo unico normalizado y no almacenado en claro.
- Hash de codigo, expiracion, estados y revocacion.
- Reenvio sin perder auditoria.
- Aceptacion movil con email, codigo, clave, confirmacion y privacidad.
- Enlaces/deep link como transporte, no como fuente de autoridad.

## Traduccion a Nomina-Ec

- La fuente de verdad es `Empleado` + tenant.
- El empleado no puede crear empresa ni autoasignarse a un tenant.
- La activacion crea o reutiliza un usuario con rol `empleado` y lo vincula a la ficha laboral.
- La asistencia se habilita solo si la configuracion laboral esta completa.

## Decision

El patron tiene sentido en la app porque reduce soporte manual, evita compartir claves genericas y permite activar asistencia desde Expo Go con bajo costo operativo.
