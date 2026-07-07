import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as Location from 'expo-location';
import { mobileAPI } from '../services/api';
import { getRouteFromCache, initRouteCache, saveRouteToCache } from '../db/route-cache';
import { todayEC } from '../utils/dateEC';

function stopTitle(stop) {
  if (stop.site?.name) return stop.site.name;
  return stop.unplannedName || 'Visita no programada';
}

function statusLabel(status) {
  const labels = {
    pending: 'Pendiente',
    in_site: 'En sitio',
    completed: 'Completada',
    omitted: 'Omitida',
    out_of_zone: 'Fuera de zona',
    exception_pending: 'Con excepción',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
}

function logRouteCacheError(message, err, code) {
  console.error(message, {
    code: err.response?.data?.error || err.code || code,
    statusCode: err.response?.status || 500,
    correlationId: err.response?.data?.correlationId || 'mobile-local',
    userId: null,
    message: err.message,
  });
}

export default function RutaHoyScreen() {
  const [route, setRoute] = useState(null);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState({ type: 'info', text: 'Cargando ruta.' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [location, setLocation] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [unplanned, setUnplanned] = useState({ siteName: '', address: '', reason: '' });
  const [omitReasons, setOmitReasons] = useState({});

  const openStop = useMemo(() => (route?.stops || []).find((stop) => stop.status === 'in_site'), [route]);
  const hasRoute = Boolean(route);

  const loadRoute = async () => {
    setLoading(true);
    try {
      await initRouteCache();
    } catch (err) {
      logRouteCacheError('[RUTAS] No se pudo inicializar cache local', err, 'RUTA_CACHE_INIT_ERROR');
    }
    try {
      const response = await mobileAPI.routeToday();
      const routeData = response.data.route || null;
      setRoute(routeData);
      setMessage(response.data.message || '');
      setIsOffline(false);
      setStatus({ type: 'success', text: routeData ? 'Ruta sincronizada.' : 'No hay ruta asignada para hoy.' });
      if (routeData) {
        saveRouteToCache(todayEC(), routeData).catch((err) => {
          logRouteCacheError('[RUTAS] No se pudo guardar cache local', err, 'RUTA_CACHE_SAVE_ERROR');
        });
      }
    } catch (err) {
      // Fallback a cache offline
      const cached = await getRouteFromCache(todayEC()).catch(() => null);
      if (cached) {
        setRoute(cached);
        setIsOffline(true);
        setStatus({ type: 'info', text: 'Datos offline — última sincronización disponible.' });
      } else {
        setStatus({ type: 'error', text: err.response?.data?.message || 'No pudimos cargar tu ruta.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const getLocation = async () => {
    const current = await Location.getForegroundPermissionsAsync();
    let granted = current.status === 'granted';
    if (!granted) {
      const requested = await Location.requestForegroundPermissionsAsync();
      granted = requested.status === 'granted';
    }
    if (!granted) {
      setStatus({ type: 'error', text: 'Activa GPS para registrar visitas.' });
      return null;
    }
    const next = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    const payload = {
      lat: next.coords.latitude,
      lng: next.coords.longitude,
      accuracy: next.coords.accuracy,
      deviceTimestamp: new Date().toISOString(),
    };
    setLocation(payload);
    return payload;
  };

  useEffect(() => {
    loadRoute();
  }, []);

  const submitVisit = async (kind, stopId, extra = {}) => {
    setSubmitting(true);
    try {
      const gps = await getLocation();
      if (!gps) return;
      const response = kind === 'arrival'
        ? await mobileAPI.routeArrival(stopId, { ...gps, ...extra })
        : await mobileAPI.routeDeparture(stopId, { ...gps, ...extra });
      setRoute(response.data.route || null);
      if (kind === 'departure') {
        Alert.alert('Gasto de movilización', 'Registra el gasto de movilización antes de continuar a la siguiente parada.', [
          { text: 'Ahora no', style: 'cancel' },
          { text: 'Entendido' },
        ]);
      }
      setStatus({ type: 'success', text: kind === 'arrival' ? 'Llegada registrada.' : 'Salida registrada.' });
    } catch (err) {
      const detail = err.response?.data?.details?.siteName ? ` (${err.response.data.details.siteName})` : '';
      setStatus({ type: 'error', text: `${err.response?.data?.message || 'No pudimos registrar la visita.'}${detail}` });
    } finally {
      setSubmitting(false);
    }
  };

  const omitStop = async (stopId) => {
    const reason = (omitReasons[stopId] || '').trim();
    if (!reason) {
      Alert.alert('Motivo requerido', 'Indica por qué omites esta visita.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await mobileAPI.routeOmit(stopId, { reason });
      setRoute(response.data.route || null);
      setStatus({ type: 'success', text: 'Visita omitida y enviada a revisión.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'No pudimos omitir la visita.' });
    } finally {
      setSubmitting(false);
    }
  };

  const addUnplannedVisit = async () => {
    if (!unplanned.reason.trim() || !unplanned.siteName.trim()) {
      Alert.alert('Datos requeridos', 'Indica sitio y motivo de la visita no programada.');
      return;
    }
    setSubmitting(true);
    try {
      const gps = await getLocation();
      if (!gps) return;
      const response = await mobileAPI.routeUnplanned({ ...gps, ...unplanned });
      setRoute(response.data.route || null);
      setUnplanned({ siteName: '', address: '', reason: '' });
      setStatus({ type: 'success', text: 'Visita no programada registrada para revisión.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.message || 'No pudimos registrar la visita no programada.' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusStyle = status.type === 'error' ? styles.statusError : (status.type === 'success' ? styles.statusSuccess : styles.statusInfo);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" size="large" />
        <Text style={styles.loadingText}>Cargando ruta...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Ruta de hoy</Text>
        <Text style={styles.title}>Visitas por tienda</Text>
        <TouchableOpacity style={styles.reloadButton} onPress={loadRoute}>
          <Text style={styles.reloadText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {isOffline && (
        <View style={styles.offlineBadge}>
          <Text style={styles.offlineBadgeText}>Datos offline</Text>
        </View>
      )}

      <View style={[styles.status, statusStyle]}>
        <Text style={styles.statusText}>{status.text}</Text>
        {message ? <Text style={styles.statusSubtext}>{message}</Text> : null}
      </View>

      {location ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>GPS actual</Text>
          <Text style={styles.cardDetail}>Lat {location.lat.toFixed(6)} | Lng {location.lng.toFixed(6)} | Precisión {Math.round(location.accuracy || 0)} m</Text>
        </View>
      ) : null}

      {!hasRoute ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sin ruta asignada</Text>
          <Text style={styles.cardDetail}>Puedes registrar tu jornada en la pestaña Marcar. Las visitas no programadas requieren motivo y revisión.</Text>
        </View>
      ) : null}

      {(route?.stops || []).map((stop) => {
        const blockedByOtherOpen = openStop && openStop.id !== stop.id;
        const canArrive = ['pending', 'out_of_zone', 'exception_pending'].includes(stop.status) && !blockedByOtherOpen;
        const canDepart = stop.status === 'in_site';
        const canOmit = stop.status === 'pending' && !openStop;
        return (
          <View style={styles.card} key={stop.id}>
            <View style={styles.stopHeader}>
              <View style={styles.stopNumber}>
                <Text style={styles.stopNumberText}>{stop.sequenceOrder}</Text>
              </View>
              <View style={styles.stopText}>
                <Text style={styles.stopTitle}>{stopTitle(stop)}</Text>
                <Text style={styles.cardDetail}>{stop.site?.address || stop.unplannedAddress || 'Sin dirección'}</Text>
              </View>
              <Text style={[styles.badge, stop.status === 'completed' && styles.badgeOk]}>{statusLabel(stop.status)}</Text>
            </View>
            {stop.lastMark ? (
              <Text style={styles.cardDetail}>Último evento: {stop.lastMark.markType} | {Math.round(stop.lastMark.distanceMeters || 0)} m</Text>
            ) : null}
            {blockedByOtherOpen ? <Text style={styles.warningText}>Primero registra la salida de {stopTitle(openStop)}.</Text> : null}
            <View style={styles.actions}>
              <TouchableOpacity disabled={!canArrive || submitting} onPress={() => submitVisit('arrival', stop.id)} style={[styles.primaryButton, styles.arrivalButton, (!canArrive || submitting) && styles.disabledButton]}>
                <Text style={styles.primaryText}>✓ Marcar llegada</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={!canDepart || submitting} onPress={() => submitVisit('departure', stop.id)} style={[styles.primaryButton, styles.departureButton, (!canDepart || submitting) && styles.disabledButton]}>
                <Text style={styles.primaryText}>→ Marcar salida</Text>
              </TouchableOpacity>
            </View>
            {canOmit ? (
              <View style={styles.omitBox}>
                <TextInput
                  onChangeText={(text) => setOmitReasons((current) => ({ ...current, [stop.id]: text }))}
                  placeholder="Motivo para omitir"
                  style={styles.input}
                  value={omitReasons[stop.id] || ''}
                />
                <TouchableOpacity disabled={submitting} onPress={() => omitStop(stop.id)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Omitir</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        );
      })}

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Visita no programada</Text>
        <TextInput
          onChangeText={(text) => setUnplanned((current) => ({ ...current, siteName: text }))}
          placeholder="Nombre del sitio"
          style={styles.input}
          value={unplanned.siteName}
        />
        <TextInput
          onChangeText={(text) => setUnplanned((current) => ({ ...current, address: text }))}
          placeholder="Dirección opcional"
          style={styles.input}
          value={unplanned.address}
        />
        <TextInput
          multiline
          onChangeText={(text) => setUnplanned((current) => ({ ...current, reason: text }))}
          placeholder="Motivo"
          style={[styles.input, styles.textarea]}
          value={unplanned.reason}
        />
        <TouchableOpacity disabled={submitting || Boolean(openStop)} onPress={addUnplannedVisit} style={[styles.primaryButton, (submitting || Boolean(openStop)) && styles.disabledButton]}>
          <Text style={styles.primaryText}>{openStop ? 'Cierra la visita abierta' : 'Agregar visita'}</Text>
        </TouchableOpacity>
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
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 4,
  },
  reloadButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  reloadText: {
    color: '#0f766e',
    fontWeight: '800',
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
    fontWeight: '700',
  },
  statusSubtext: {
    color: '#475569',
    fontSize: 13,
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
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardDetail: {
    color: '#334155',
    fontSize: 14,
    marginTop: 2,
  },
  stopHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stopNumber: {
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  stopNumberText: {
    color: '#0f766e',
    fontWeight: '900',
  },
  stopText: {
    flex: 1,
  },
  stopTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeOk: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  warningText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    flex: 1,
    minHeight: 46,
    justifyContent: 'center',
  },
  arrivalButton: {
    backgroundColor: '#16a34a',
  },
  departureButton: {
    backgroundColor: '#d97706',
  },
  disabledButton: {
    backgroundColor: '#cbd5e1',
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryText: {
    color: '#0f766e',
    fontWeight: '800',
  },
  offlineBadge: {
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    marginBottom: 10,
    padding: 8,
  },
  offlineBadgeText: {
    color: '#92400e',
    fontSize: 12,
    fontWeight: '800',
  },
  omitBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    flex: 1,
    marginTop: 8,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  textarea: {
    minHeight: 82,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
});
