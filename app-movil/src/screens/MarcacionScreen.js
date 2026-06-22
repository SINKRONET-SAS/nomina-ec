import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { mobileAPI } from '../services/api';

function formatMark(mark) {
  if (!mark) return 'Sin marcaciones hoy';
  return `${String(mark.tipo_marcacion || '').replace(/_/g, ' ')} - ${new Date(mark.timestamp).toLocaleString('es-EC', { timeZone: 'America/Guayaquil' })}`;
}

export default function MarcacionScreen({ onLogout }) {
  const [ubicacion, setUbicacion] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [ultimaMarcacion, setUltimaMarcacion] = useState(null);
  const [status, setStatus] = useState({ type: 'info', text: 'Preparando asistencia movil.' });
  const [permissionStatus, setPermissionStatus] = useState('checking');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const ultimoTipo = ultimaMarcacion?.tipo_marcacion || '';
  const puedeMarcarInicio = !ultimaMarcacion || ultimoTipo === 'fin_jornada';
  const puedeIniciarAlmuerzo = ultimoTipo === 'inicio_jornada' || ultimoTipo === 'fin_almuerzo';
  const puedeFinalizarAlmuerzo = ultimoTipo === 'inicio_almuerzo';
  const puedeMarcarFin = ultimoTipo === 'inicio_jornada' || ultimoTipo === 'fin_almuerzo';
  const zonaMarcacion = employee?.zona_marcacion;
  const readiness = employee?.readiness || {};
  const attendanceReady = Boolean(readiness.ready);
  const blockers = readiness.blockers || [];
  const gpsReady = permissionStatus === 'granted';
  const markBlocked = submitting || !employee || !attendanceReady || !gpsReady;

  const statusStyle = useMemo(() => {
    if (status.type === 'error') return styles.statusError;
    if (status.type === 'success') return styles.statusSuccess;
    return styles.statusInfo;
  }, [status.type]);

  const verificarPermisoUbicacion = async () => {
    setPermissionStatus('checking');
    const current = await Location.getForegroundPermissionsAsync();
    if (current.status === 'granted') {
      setPermissionStatus('granted');
      return true;
    }

    const requested = await Location.requestForegroundPermissionsAsync();
    if (requested.status !== 'granted') {
      setPermissionStatus('denied');
      setUbicacion(null);
      setStatus({ type: 'error', text: 'Activa el permiso GPS para registrar asistencia. La marcacion queda bloqueada por privacidad y control laboral.' });
      return false;
    }

    setPermissionStatus('granted');
    return true;
  };

  const cargarResumen = async () => {
    setLoading(true);
    try {
      const response = await mobileAPI.attendanceSummary();
      const nextEmployee = response.data.employee;
      setEmployee(nextEmployee);
      setUltimaMarcacion((response.data.marcaciones || [])[0] || null);
      if (nextEmployee?.readiness?.ready) {
        setStatus({ type: 'success', text: 'Asistencia sincronizada.' });
      } else {
        setStatus({ type: 'error', text: 'RRHH debe completar unidad, zona y jornada antes de marcar.' });
      }
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'No pudimos cargar tu asistencia movil.' });
    } finally {
      setLoading(false);
    }
  };

  const obtenerUbicacion = async () => {
    const allowed = await verificarPermisoUbicacion();
    if (!allowed) return null;

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const next = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
    setUbicacion(next);
    return next;
  };

  useEffect(() => {
    verificarPermisoUbicacion();
    cargarResumen();
  }, []);

  const registrarMarcacion = async (tipo) => {
    setSubmitting(true);
    try {
      const currentLocation = ubicacion || await obtenerUbicacion();
      if (!currentLocation) return;

      const response = await mobileAPI.registerMark({
        tipo,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        accuracy: currentLocation.accuracy,
      });
      setUltimaMarcacion(response.data.marcacion);
      setEmployee(response.data.employee || employee);
      const zona = response.data.marcacion?.zonaMarcacion || response.data.employee?.zona_marcacion || zonaMarcacion;
      setStatus({
        type: 'success',
        text: `Marcacion registrada: ${tipo.replace(/_/g, ' ')}.${zona?.nombre ? ` Zona: ${zona.nombre}.` : ''}`,
      });
    } catch (err) {
      const details = err.response?.data?.details;
      const detailText = details?.distanciaMetros
        ? ` Distancia: ${details.distanciaMetros} m de ${details.radioPermitidoMetros} m permitidos.`
        : '';
      setStatus({ type: 'error', text: `${err.response?.data?.message || 'No pudimos registrar la marcacion.'}${detailText}` });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" size="large" />
        <Text style={styles.loadingText}>Cargando asistencia...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Asistencia movil</Text>
          <Text style={styles.title}>Marcacion de jornada</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Empleado</Text>
        <Text style={styles.employeeName}>{employee ? `${employee.nombres} ${employee.apellidos}` : 'Sin empleado vinculado'}</Text>
        <Text style={styles.cardDetail}>{employee?.cargo || 'Cargo no registrado'}</Text>
        <Text style={styles.cardDetail}>
          Zona: {zonaMarcacion ? `${zonaMarcacion.nombre} (${zonaMarcacion.codigo})` : 'Zona no asignada'}
        </Text>
        <Text style={styles.cardDetail}>
          Unidad: {employee?.unidad_organizativa ? `${employee.unidad_organizativa.nombre} (${employee.unidad_organizativa.codigo})` : 'Unidad no vinculada'}
        </Text>
        <Text style={styles.cardDetail}>
          Jornada: {employee?.jornada ? `${employee.jornada.nombre} ${employee.jornada.inicio}-${employee.jornada.fin}` : 'Jornada no asignada'}
        </Text>
        {zonaMarcacion ? (
          <Text style={styles.cardDetail}>Radio autorizado: {zonaMarcacion.radio_metros} m | Precision minima: {zonaMarcacion.precision_minima_metros || '-'} m</Text>
        ) : (
          <Text style={styles.warningText}>Solicita a RRHH vincular tu unidad organizativa a una zona de marcacion.</Text>
        )}
        {!attendanceReady && blockers.length > 0 ? (
          <Text style={styles.warningText}>Pendiente RRHH: {blockers.join(', ')}</Text>
        ) : null}
      </View>

      <View style={[styles.status, statusStyle]}>
        <Text style={styles.statusText}>{status.text}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>GPS y ubicacion actual</Text>
        <Text style={gpsReady ? styles.cardDetail : styles.warningText}>
          Permiso GPS: {permissionStatus === 'checking' ? 'verificando' : (gpsReady ? 'activo' : 'bloqueado')}
        </Text>
        {ubicacion ? (
          <Text style={styles.mono}>Lat {ubicacion.lat.toFixed(6)} | Lng {ubicacion.lng.toFixed(6)} | Precision {Math.round(ubicacion.accuracy || 0)} m</Text>
        ) : (
          <Text style={styles.cardDetail}>Ubicacion pendiente</Text>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={obtenerUbicacion}>
          <Text style={styles.secondaryButtonText}>{gpsReady ? 'Actualizar ubicacion' : 'Reintentar permiso GPS'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          disabled={!puedeMarcarInicio || markBlocked}
          onPress={() => registrarMarcacion('inicio_jornada')}
          style={[styles.primaryButton, styles.startButton, (!puedeMarcarInicio || markBlocked) && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Procesando' : 'Iniciar jornada'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!puedeIniciarAlmuerzo || markBlocked}
          onPress={() => registrarMarcacion('inicio_almuerzo')}
          style={[styles.primaryButton, styles.lunchStartButton, (!puedeIniciarAlmuerzo || markBlocked) && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Procesando' : 'Iniciar almuerzo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!puedeFinalizarAlmuerzo || markBlocked}
          onPress={() => registrarMarcacion('fin_almuerzo')}
          style={[styles.primaryButton, styles.lunchEndButton, (!puedeFinalizarAlmuerzo || markBlocked) && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Procesando' : 'Finalizar almuerzo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!puedeMarcarFin || markBlocked}
          onPress={() => registrarMarcacion('fin_jornada')}
          style={[styles.primaryButton, styles.endButton, (!puedeMarcarFin || markBlocked) && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Procesando' : 'Finalizar jornada'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Ultima marcacion</Text>
        <Text style={styles.cardDetail}>{formatMark(ultimaMarcacion)}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#475569',
    marginTop: 12,
  },
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    padding: 20,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  logoutButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  logoutButtonText: {
    color: '#334155',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  cardLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  employeeName: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  cardDetail: {
    color: '#334155',
    fontSize: 14,
  },
  warningText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  mono: {
    color: '#334155',
    fontFamily: 'monospace',
    fontSize: 13,
  },
  status: {
    borderRadius: 8,
    marginBottom: 14,
    padding: 12,
  },
  statusInfo: {
    backgroundColor: '#eff6ff',
  },
  statusSuccess: {
    backgroundColor: '#ecfdf5',
  },
  statusError: {
    backgroundColor: '#fef2f2',
  },
  statusText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
    marginBottom: 14,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    minHeight: 54,
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#0f766e',
  },
  endButton: {
    backgroundColor: '#b91c1c',
  },
  lunchStartButton: {
    backgroundColor: '#0369a1',
  },
  lunchEndButton: {
    backgroundColor: '#0f766e',
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 42,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontWeight: '700',
  },
});
