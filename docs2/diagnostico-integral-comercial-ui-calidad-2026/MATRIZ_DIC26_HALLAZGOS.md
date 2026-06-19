# Matriz DIC26 - Diagnostico integral comercial, UI y calidad

| ID | Severidad | Hallazgo | Evidencia | Accion |
|----|-----------|----------|-----------|--------|
| DIC-H01 | Alta | Oferta comercial visible insuficiente en primer recorrido publico | Landing tenia CTA a planes, pero no una oferta resumida visible con opciones y valor | Agregar bloque `Oferta comercial` con prueba, PYME y corporativo. |
| DIC-H02 | Alta | Clave web sin ojo de verificacion | Login, registro y recuperacion usaban `type=password` sin alternar visibilidad | Agregar mostrar/ocultar contrasena con iconos y accesibilidad. |
| DIC-H03 | Alta | App movil ocultaba pantallas existentes | `MisMarcacionesScreen` y `AutoservicioScreen` no estaban conectadas en `App.js` | Exponer tabs simples: marcar, historial y perfil. |
| DIC-H04 | Media | Permiso y dependencia de camara sin flujo real | `expo-camera`, `camera.js`, permiso Android/iOS; la app no capturaba foto | Retirar permiso/dependencia/servicio hasta implementar evidencia fotografica real. |
| DIC-H05 | Media | Dependencias de navegacion movil instaladas sin uso real | `@react-navigation/*` y `react-native-screens` no estaban importadas | Desinstalar dependencias y usar tabs nativos simples. |
| DIC-H06 | Media | Riesgo de falso mojibake por consola | PowerShell muestra acentos corruptos aunque Node lee UTF-8 correcto | Crear gate Node de BOM/mojibake y limpiar BOM heredados. |
| DIC-H07 | Media | BOM heredado en archivos runtime | `Login.jsx`, `ForgotPassword.jsx`, `App.js`, `geolocation.js`, `App.jsx`, `AuthContext.jsx`, `Layout.jsx` | Reescribir sin BOM. |
| DIC-H08 | Baja | Reportes historicos contenian ejemplos literales de mojibake | Dos reportes `docs2` activaban falsos positivos | Reescribir ejemplos sin secuencias corruptas literales. |
| DIC-H09 | Baja | Historial movil usaba timezone del dispositivo | `MisMarcacionesScreen` formateaba timestamp sin America/Guayaquil | Formatear historial con `America/Guayaquil`. |
| DIC-H10 | Baja | Autoservicio movil calculaba periodo con zona del dispositivo | `new Date()` local para periodo actual | Calcular periodo con `America/Guayaquil`. |

## Criterio de cierre

- Build frontend pasa.
- Backend tests pasan.
- Store readiness y Expo doctor pasan.
- Gate UTF-8/BOM/mojibake pasa.
- No queda permiso de camara ni dependencia movil retirada.
- Commit y push en rama activa.
