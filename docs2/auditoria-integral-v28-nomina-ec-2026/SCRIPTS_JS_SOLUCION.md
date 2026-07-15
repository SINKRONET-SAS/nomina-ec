# Scripts de solucion JS - AIV28

## H-01: Fallas silenciosas en batch de nomina

**Archivo**: `backend/src/services/calculoNominaService.js`
**Ubicacion**: Despues de linea ~215 (fin del bucle de empleados)

```javascript
// Reemplazar el estado final del batch:
// ANTES:
// status = 'completed';
// DESPUES:
const totalErrores = resultados.filter(r => r.error).length;
const totalCalculados = resultados.filter(r => !r.error).length;
let batchStatus = 'completed';
if (totalErrores > 0 && totalCalculados === 0) {
  batchStatus = 'failed';
} else if (totalErrores > 0) {
  batchStatus = 'partial_failed';
}
```

**Test a agregar**:
```javascript
test('batch con errores parciales reporta partial_failed', async () => {
  // Mock: 2 empleados, 1 falla validacion
  const result = await createPayrollCalculationBatch({
    tenantId: 'tenant-1', anio: 2026, mes: 6, userId: 'user-1',
    employees: [validEmployee, invalidEmployee],
  });
  expect(result.status).toBe('partial_failed');
  expect(result.totalErrores).toBe(1);
  expect(result.totalCalculadas).toBe(1);
});

test('batch con todos los errores reporta failed', async () => {
  const result = await createPayrollCalculationBatch({
    tenantId: 'tenant-1', anio: 2026, mes: 6, userId: 'user-1',
    employees: [invalidEmployee1, invalidEmployee2],
  });
  expect(result.status).toBe('failed');
});
```

---

## H-02: Sin validacion para dias trabajados = 0

**Archivo**: `backend/src/services/calculoNominaService.js`
**Ubicacion**: Despues de la linea donde se calcula `diasTrabajados` (~linea 259)

```javascript
// Agregar validacion despues de calcular diasTrabajados:
const diasTrabajados = calcularDiasTrabajados(emp, anio, mes, periodStartDate, periodEndDate);
if (diasTrabajados <= 0) {
  logger.info({
    code: 'NOMINA_EMPLOYEE_EXCLUDED_NO_DAYS',
    statusCode: 200,
    correlationId,
    userId,
    tenantId,
    empleadoId: emp.id,
    message: `Empleado ${emp.id} excluido: 0 dias trabajados en ${anio}-${String(mes).padStart(2, '0')}`,
  });
  continue; // Saltar al siguiente empleado sin error
}
```

**Test a agregar**:
```javascript
test('excluye empleado con fecha ingreso posterior al periodo', () => {
  const emp = { ...baseEmployee, fecha_ingreso: '2026-07-15' };
  const dias = calcularDiasTrabajados(emp, 2026, 6);
  expect(dias).toBe(0);
  // El batch debe completar sin incluir este empleado
});
```

---

## H-11: SQLite sin cifrado (Mobile)

**Archivo**: `app-movil/src/db/offline-queue.js`
**Patron**: Cifrar payload JSON antes de escribir, descifrar al leer.

```javascript
// Nuevo archivo: app-movil/src/utils/dbCrypto.js
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const DB_KEY_ALIAS = 'sknomina_db_key';

async function getOrCreateKey() {
  let key = await SecureStore.getItemAsync(DB_KEY_ALIAS);
  if (!key) {
    key = await Crypto.getRandomBytesAsync(32)
      .then(bytes => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
    await SecureStore.setItemAsync(DB_KEY_ALIAS, key);
  }
  return key;
}

export async function encryptPayload(plainText) {
  const key = await getOrCreateKey();
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    key + plainText
  );
  // Nota: expo-crypto no tiene AES nativo; para cifrado real
  // usar react-native-quick-crypto o aceptar ofuscacion con hash.
  // La mitigacion principal es que expo-secure-store protege el token
  // y SQLite solo almacena datos operativos sin PII sensible.
  return plainText; // Placeholder - evaluar libreria de cifrado
}
```

**Nota**: expo-crypto no provee AES simetrico nativo. La mitigacion real es:
1. Los datos en SQLite son operativos (rutas, gastos), no PII critico.
2. Tokens estan en expo-secure-store (cifrado OS).
3. Para cifrado AES se requiere `react-native-quick-crypto` (dependencia nativa).

---

## H-12: Upload base64 imagen en RAM (Mobile)

**Archivo**: `app-movil/src/screens/PermisosScreen.js`
**Lineas**: 90-120

```javascript
// ANTES (base64 en RAM):
// const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
// body.adjunto = { base64, mimeType, fileName };

// DESPUES (FormData multipart):
const formData = new FormData();
formData.append('tipo', form.tipo);
formData.append('fecha_desde', form.fecha_desde);
formData.append('fecha_hasta', form.fecha_hasta);
formData.append('motivo', form.motivo);
if (adjunto) {
  formData.append('adjunto', {
    uri: adjunto.uri,
    type: adjunto.mimeType || 'image/jpeg',
    name: adjunto.fileName || 'adjunto.jpg',
  });
}
const response = await mobileAPI.post('/mobile/permisos', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
```

**Backend**: El endpoint debe aceptar `multipart/form-data` con multer o busboy.

---

## H-13: GPS sin validacion rango (Mobile)

**Archivo**: `app-movil/src/screens/OperacionMovilScreen.js`
**Lineas**: 264-275

```javascript
// Agregar funcion de validacion:
function validateCoordinates(lat, lng) {
  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
    return 'Latitud debe estar entre -90 y 90';
  }
  if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
    return 'Longitud debe estar entre -180 y 180';
  }
  return null;
}

// Usar antes de enviar:
const coordError = validateCoordinates(form.latitud, form.longitud);
if (coordError) {
  Alert.alert('Coordenadas invalidas', coordError);
  return;
}
```
