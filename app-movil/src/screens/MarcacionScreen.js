import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { mobileAPI } from '../services/api';

function formatMark(mark) {
  if (!mark) return 'Sin marcaciones hoy';
  return `${String(mark.tipo_marcacion || '').replace(/_/g, ' ')} - ${new Date(mark.timestamp).toLocaleString('es-EC')}`;
}

export default function MarcacionScreen() {
  const [ubicacion, setUbicacion] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [ultimaMarcacion, setUltimaMarcacion] = useState(null);
  const [status, setStatus] = useState({ type: 'info', text: 'Preparando asistencia movil.' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const puedeMarcarInicio = !ultimaMarcacion || ultimaMarcacion.tipo_marcacion === 'fin_jornada';
  const puedeMarcarFin = ultimaMarcacion && ultimaMarcacion.tipo_marcacion === 'inicio_jornada';

  const statusStyle = useMemo(() => {
    if (status.type === 'error') return styles.statusError;
    if (status.type === 'success') return styles.statusSuccess;
    return styles.statusInfo;
  }, [status.type]);

  const cargarResumen = async () => {
    setLoading(true);
    try {
      const response = await mobileAPI.attendanceSummary();
      setEmployee(response.data.employee);
      setUltimaMarcacion((response.data.marcaciones || [])[0] || null);
      setStatus({ type: 'success', text: 'Asistencia sincronizada.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'No pudimos cargar tu asistencia movil.' });
    } finally {
      setLoading(false);
    }
  };

  const obtenerUbicacion = async () => {
    const { status: permission } = await Location.requestForegroundPermissionsAsync();
    if (permission !== 'granted') {
      setStatus({ type: 'error', text: 'Activa el permiso de ubicacion para registrar asistencia.' });
      return null;
    }

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
    cargarResumen();
    obtenerUbicacion().catch(() => setStatus({ type: 'error', text: 'No pudimos obtener ubicacion.' }));
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
      });
      setUltimaMarcacion(response.data.marcacion);
      setEmployee(response.data.employee || employee);
      setStatus({ type: 'success', text: `Marcacion registrada: ${tipo.replace(/_/g, ' ')}.` });
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'No pudimos registrar la marcacion.' });
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
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Asistencia movil</Text>
      <Text style={styles.title}>Marcacion de jornada</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Empleado</Text>
        <Text style={styles.employeeName}>{employee ? `${employee.nombres} ${employee.apellidos}` : 'Sin empleado vinculado'}</Text>
        <Text style={styles.cardDetail}>{employee?.cargo || 'Cargo no registrado'}</Text>
      </View>

      <View style={[styles.status, statusStyle]}>
        <Text style={styles.statusText}>{status.text}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Ubicacion actual</Text>
        {ubicacion ? (
          <Text style={styles.mono}>Lat {ubicacion.lat.toFixed(6)} | Lng {ubicacion.lng.toFixed(6)}</Text>
        ) : (
          <Text style={styles.cardDetail}>Ubicacion pendiente</Text>
        )}
        <TouchableOpacity style={styles.secondaryButton} onPress={obtenerUbicacion}>
          <Text style={styles.secondaryButtonText}>Actualizar ubicacion</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          disabled={!puedeMarcarInicio || submitting || !employee}
          onPress={() => registrarMarcacion('inicio_jornada')}
          style={[styles.primaryButton, styles.startButton, (!puedeMarcarInicio || submitting || !employee) && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Procesando' : 'Iniciar jornada'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={!puedeMarcarFin || submitting || !employee}
          onPress={() => registrarMarcacion('fin_jornada')}
          style={[styles.primaryButton, styles.endButton, (!puedeMarcarFin || submitting || !employee) && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>{submitting ? 'Procesando' : 'Finalizar jornada'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Ultima marcacion</Text>
        <Text style={styles.cardDetail}>{formatMark(ultimaMarcacion)}</Text>
      </View>
    </View>
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
    flex: 1,
    padding: 20,
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
    marginBottom: 18,
    marginTop: 4,
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
