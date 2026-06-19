# CSW26-02 - Auth, verificacion y recuperacion

## Objetivo

Conectar SMTP a registro publico, registro interno, solicitud de verificacion, confirmacion y recuperacion de clave.

## Tareas

1. Reusar tokens hasheados existentes.
2. Enviar codigo de verificacion por SMTP.
3. Enviar codigo de recuperacion por SMTP.
4. Mantener anti-enumeracion en solicitudes publicas.
5. No devolver codigos en respuestas API.

## Cierre

Los endpoints conservan compatibilidad y exponen estado de entrega solo donde no filtre existencia de cuentas.
