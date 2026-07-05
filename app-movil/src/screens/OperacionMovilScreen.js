import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { mobileAPI } from '../services/api';
import { todayEC } from '../utils/dateEC';

const emptySummary = {
  allowedActions: {},
  workZones: [],
  routeSites: [],
  routeDays: [],
  employees: [],
};

const initialZoneForm = {
  code: '',
  name: '',
  latitude: '',
  longitude: '',
  radiusMeters: '100',
  requiresPhoto: true,
};

const initialSiteForm = {
  code: '',
  name: '',
  clientName: '',
  address: '',
  latitude: '',
  longitude: '',
  radiusMeters: '120',
};

function roleName(role) {
  const labels = {
    owner: 'Owner',
    admin_rrhh: 'RRHH',
    supervisor: 'Supervisor',
  };
  return labels[role] || 'Usuario';
}

function compactName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

export default function OperacionMovilScreen({ user }) {
  const [fecha, setFecha] = useState(todayEC());
  const [summary, setSummary] = useState(emptySummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [zoneForm, setZoneForm] = useState(initialZoneForm);
  const [siteForm, setSiteForm] = useState(initialSiteForm);
  const [routeForm, setRouteForm] = useState({
    employeeId: '',
    siteId: '',
    plannedStartTime: '',
    plannedEndTime: '',
    notes: '',
  });

  const allowed = summary.allowedActions || {};
  const canCreateWorkZones = Boolean(allowed.createWorkZones);
  const canCreateRouteSites = Boolean(allowed.createRouteSites);
  const canAssignRoutes = Boolean(allowed.assignRoutes);

  const selectedEmployee = useMemo(
    () => summary.employees.find((employee) => employee.id === routeForm.employeeId),
    [routeForm.employeeId, summary.employees]
  );
  const selectedSite = useMemo(
    () => summary.routeSites.find((site) => site.id === routeForm.siteId),
    [routeForm.siteId, summary.routeSites]
  );

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await mobileAPI.adminRoutesSummary(fecha);
      setSummary({
        allowedActions: response.data?.allowedActions || {},
        workZones: response.data?.workZones || [],
        routeSites: response.data?.routeSites || [],
        routeDays: response.data?.routeDays || [],
        employees: response.data?.employees || [],
      });
    } catch (err) {
      console.error('[MOBILE] No se pudo consultar operacion movil', {
        code: err?.response?.data?.error || 'MOBILE_OPERATION_SUMMARY_ERROR',
        statusCode: err?.response?.status || 500,
        correlationId: err?.response?.data?.correlationId || 'mobile-local',
        userId: user?.id || null,
        message: err.message,
      });
      setMessage(err?.response?.data?.message || 'No pudimos consultar la operacion movil.');
    } finally {
      setLoading(false);
    }
  }, [fecha, user?.id]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const fillGps = async (target) => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setMessage('Activa permisos de ubicacion para capturar GPS.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const values = {
        latitude: String(position.coords.latitude.toFixed(7)),
        longitude: String(position.coords.longitude.toFixed(7)),
      };
      if (target === 'zone') {
        setZoneForm((current) => ({ ...current, ...values }));
      } else {
        setSiteForm((current) => ({ ...current, ...values }));
      }
    } catch (err) {
      console.error('[MOBILE] No se pudo capturar GPS para administracion', {
        code: err.code || 'MOBILE_GPS_ADMIN_CAPTURE_ERROR',
        statusCode: 500,
        correlationId: 'mobile-local',
        userId: user?.id || null,
        message: err.message,
      });
      setMessage('No pudimos obtener la ubicacion actual.');
    }
  };

  const createWorkZone = async () => {
    if (!zoneForm.code || !zoneForm.name || !zoneForm.latitude || !zoneForm.longitude) {
      Alert.alert('Datos incompletos', 'Codigo, nombre, latitud y longitud son obligatorios.');
      return;
    }
    setSaving('zone');
    setMessage('');
    try {
      await mobileAPI.adminCreateWorkZone(zoneForm);
      setZoneForm(initialZoneForm);
      setMessage('Zona de marcacion creada.');
      await loadSummary();
    } catch (err) {
      console.error('[MOBILE] No se pudo crear zona de marcacion', {
        code: err?.response?.data?.error || 'MOBILE_WORK_ZONE_CREATE_ERROR',
        statusCode: err?.response?.status || 500,
        correlationId: err?.response?.data?.correlationId || 'mobile-local',
        userId: user?.id || null,
        message: err.message,
      });
      setMessage(err?.response?.data?.message || 'No pudimos crear la zona.');
    } finally {
      setSaving('');
    }
  };

  const createRouteSite = async () => {
    if (!siteForm.code || !siteForm.name || !siteForm.latitude || !siteForm.longitude) {
      Alert.alert('Datos incompletos', 'Codigo, nombre, latitud y longitud son obligatorios.');
      return;
    }
    setSaving('site');
    setMessage('');
    try {
      await mobileAPI.adminCreateRouteSite(siteForm);
      setSiteForm(initialSiteForm);
      setMessage('Sitio de ruta creado.');
      await loadSummary();
    } catch (err) {
      console.error('[MOBILE] No se pudo crear sitio de ruta', {
        code: err?.response?.data?.error || 'MOBILE_ROUTE_SITE_CREATE_ERROR',
        statusCode: err?.response?.status || 500,
        correlationId: err?.response?.data?.correlationId || 'mobile-local',
        userId: user?.id || null,
        message: err.message,
      });
      setMessage(err?.response?.data?.message || 'No pudimos crear el sitio.');
    } finally {
      setSaving('');
    }
  };

  const assignRoute = async () => {
    if (!routeForm.employeeId || !routeForm.siteId) {
      Alert.alert('Ruta incompleta', 'Selecciona empleado y sitio.');
      return;
    }
    setSaving('route');
    setMessage('');
    try {
      await mobileAPI.adminAssignRoute({
        fecha,
        employeeId: routeForm.employeeId,
        siteId: routeForm.siteId,
        plannedStartTime: routeForm.plannedStartTime,
        plannedEndTime: routeForm.plannedEndTime,
        notes: routeForm.notes,
      });
      setRouteForm({
        employeeId: routeForm.employeeId,
        siteId: '',
        plannedStartTime: '',
        plannedEndTime: '',
        notes: '',
      });
      setMessage('Ruta asignada.');
      await loadSummary();
    } catch (err) {
      console.error('[MOBILE] No se pudo asignar ruta', {
        code: err?.response?.data?.error || 'MOBILE_ROUTE_ASSIGN_ERROR',
        statusCode: err?.response?.status || 500,
        correlationId: err?.response?.data?.correlationId || 'mobile-local',
        userId: user?.id || null,
        message: err.message,
      });
      setMessage(err?.response?.data?.message || 'No pudimos asignar la ruta.');
    } finally {
      setSaving('');
    }
  };

  const renderWorkZoneSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Zona de marcacion</Text>
        <TouchableOpacity style={styles.lightButton} onPress={() => fillGps('zone')}>
          <Text style={styles.lightButtonText}>GPS</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TextInput
          autoCapitalize="characters"
          onChangeText={(code) => setZoneForm((current) => ({ ...current, code }))}
          placeholder="Codigo"
          style={styles.input}
          value={zoneForm.code}
        />
        <TextInput
          onChangeText={(name) => setZoneForm((current) => ({ ...current, name }))}
          placeholder="Nombre"
          style={styles.input}
          value={zoneForm.name}
        />
      </View>
      <View style={styles.row}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(latitude) => setZoneForm((current) => ({ ...current, latitude }))}
          placeholder="Latitud"
          style={styles.input}
          value={zoneForm.latitude}
        />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(longitude) => setZoneForm((current) => ({ ...current, longitude }))}
          placeholder="Longitud"
          style={styles.input}
          value={zoneForm.longitude}
        />
      </View>
      <View style={styles.row}>
        <TextInput
          keyboardType="numeric"
          onChangeText={(radiusMeters) => setZoneForm((current) => ({ ...current, radiusMeters }))}
          placeholder="Radio metros"
          style={styles.input}
          value={zoneForm.radiusMeters}
        />
        <View style={styles.switchBox}>
          <Text style={styles.switchLabel}>Foto obligatoria</Text>
          <Switch
            onValueChange={(requiresPhoto) => setZoneForm((current) => ({ ...current, requiresPhoto }))}
            value={zoneForm.requiresPhoto}
          />
        </View>
      </View>
      <TouchableOpacity
        disabled={saving === 'zone'}
        onPress={createWorkZone}
        style={[styles.primaryButton, saving === 'zone' && styles.buttonBusy]}
      >
        <Text style={styles.primaryButtonText}>{saving === 'zone' ? 'Guardando...' : 'Guardar zona'}</Text>
      </TouchableOpacity>

      {summary.workZones.slice(0, 4).map((zone) => (
        <View key={zone.id} style={styles.listItem}>
          <Text style={styles.itemTitle}>{zone.name}</Text>
          <Text style={styles.itemText}>{zone.code} | radio {zone.radiusMeters} m</Text>
        </View>
      ))}
    </View>
  );

  const renderRouteSiteSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Sitio de ruta</Text>
        <TouchableOpacity style={styles.lightButton} onPress={() => fillGps('site')}>
          <Text style={styles.lightButtonText}>GPS</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.row}>
        <TextInput
          autoCapitalize="characters"
          onChangeText={(code) => setSiteForm((current) => ({ ...current, code }))}
          placeholder="Codigo"
          style={styles.input}
          value={siteForm.code}
        />
        <TextInput
          onChangeText={(name) => setSiteForm((current) => ({ ...current, name }))}
          placeholder="Nombre"
          style={styles.input}
          value={siteForm.name}
        />
      </View>
      <TextInput
        onChangeText={(clientName) => setSiteForm((current) => ({ ...current, clientName }))}
        placeholder="Cliente o cadena"
        style={styles.input}
        value={siteForm.clientName}
      />
      <TextInput
        onChangeText={(address) => setSiteForm((current) => ({ ...current, address }))}
        placeholder="Direccion"
        style={styles.input}
        value={siteForm.address}
      />
      <View style={styles.row}>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(latitude) => setSiteForm((current) => ({ ...current, latitude }))}
          placeholder="Latitud"
          style={styles.input}
          value={siteForm.latitude}
        />
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(longitude) => setSiteForm((current) => ({ ...current, longitude }))}
          placeholder="Longitud"
          style={styles.input}
          value={siteForm.longitude}
        />
      </View>
      <TextInput
        keyboardType="numeric"
        onChangeText={(radiusMeters) => setSiteForm((current) => ({ ...current, radiusMeters }))}
        placeholder="Radio metros"
        style={styles.input}
        value={siteForm.radiusMeters}
      />
      <TouchableOpacity
        disabled={saving === 'site'}
        onPress={createRouteSite}
        style={[styles.primaryButton, saving === 'site' && styles.buttonBusy]}
      >
        <Text style={styles.primaryButtonText}>{saving === 'site' ? 'Guardando...' : 'Guardar sitio'}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAssignRouteSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Asignar ruta</Text>
      <TextInput
        onChangeText={setFecha}
        placeholder="AAAA-MM-DD"
        style={styles.input}
        value={fecha}
      />

      <Text style={styles.fieldLabel}>Empleado</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
        {summary.employees.map((employee) => {
          const active = employee.id === routeForm.employeeId;
          return (
            <TouchableOpacity
              key={employee.id}
              onPress={() => setRouteForm((current) => ({ ...current, employeeId: employee.id }))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {compactName(employee.name, employee.cedula)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.fieldLabel}>Sitio</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipStrip}>
        {summary.routeSites.map((site) => {
          const active = site.id === routeForm.siteId;
          return (
            <TouchableOpacity
              key={site.id}
              onPress={() => setRouteForm((current) => ({ ...current, siteId: site.id }))}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {compactName(site.name, site.code)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        <TextInput
          onChangeText={(plannedStartTime) => setRouteForm((current) => ({ ...current, plannedStartTime }))}
          placeholder="Desde HH:mm"
          style={styles.input}
          value={routeForm.plannedStartTime}
        />
        <TextInput
          onChangeText={(plannedEndTime) => setRouteForm((current) => ({ ...current, plannedEndTime }))}
          placeholder="Hasta HH:mm"
          style={styles.input}
          value={routeForm.plannedEndTime}
        />
      </View>
      <TextInput
        onChangeText={(notes) => setRouteForm((current) => ({ ...current, notes }))}
        placeholder="Notas"
        style={styles.input}
        value={routeForm.notes}
      />

      {(selectedEmployee || selectedSite) && (
        <View style={styles.selectionBox}>
          <Text style={styles.selectionText}>
            {selectedEmployee ? compactName(selectedEmployee.name, selectedEmployee.cedula) : 'Empleado pendiente'}
          </Text>
          <Text style={styles.selectionText}>
            {selectedSite ? compactName(selectedSite.name, selectedSite.code) : 'Sitio pendiente'}
          </Text>
        </View>
      )}

      <TouchableOpacity
        disabled={saving === 'route'}
        onPress={assignRoute}
        style={[styles.primaryButton, saving === 'route' && styles.buttonBusy]}
      >
        <Text style={styles.primaryButtonText}>{saving === 'route' ? 'Asignando...' : 'Asignar ruta'}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{roleName(user?.rol)}</Text>
          <Text style={styles.title}>Operacion de campo</Text>
        </View>
        <TouchableOpacity style={styles.reloadButton} onPress={loadSummary}>
          <Text style={styles.reloadText}>Actualizar</Text>
        </TouchableOpacity>
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#0f766e" size="large" />
          <Text style={styles.loadingText}>Cargando operacion...</Text>
        </View>
      ) : (
        <>
          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Sitios</Text>
              <Text style={styles.metricValue}>{summary.routeSites.length}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Rutas</Text>
              <Text style={styles.metricValue}>{summary.routeDays.length}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Equipo</Text>
              <Text style={styles.metricValue}>{summary.employees.length}</Text>
            </View>
          </View>

          {canCreateWorkZones && renderWorkZoneSection()}
          {canCreateRouteSites && renderRouteSiteSection()}
          {canAssignRoutes && renderAssignRouteSection()}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rutas vigentes</Text>
            {summary.routeDays.length === 0 ? (
              <Text style={styles.itemText}>No hay rutas asignadas para la fecha seleccionada.</Text>
            ) : (
              summary.routeDays.slice(0, 8).map((route) => (
                <View key={route.id} style={styles.listItem}>
                  <Text style={styles.itemTitle}>{route.employeeName || route.empleadoId}</Text>
                  <Text style={styles.itemText}>
                    {route.status} | paradas {route.totals?.total ?? route.stops?.length ?? 0}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonBusy: {
    opacity: 0.7,
  },
  chip: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  chipActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  chipStrip: {
    marginBottom: 10,
  },
  chipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  chipTextActive: {
    color: '#ffffff',
  },
  container: {
    padding: 16,
    paddingBottom: 30,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
    marginTop: 4,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  itemText: {
    color: '#475569',
    fontSize: 12,
    marginTop: 3,
  },
  itemTitle: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
  },
  lightButton: {
    alignItems: 'center',
    borderColor: '#0f766e',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  lightButtonText: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '900',
  },
  listItem: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  loadingText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 10,
  },
  message: {
    backgroundColor: '#ecfeff',
    borderColor: '#67e8f9',
    borderRadius: 8,
    borderWidth: 1,
    color: '#155e75',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 12,
    padding: 10,
  },
  metric: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    padding: 12,
  },
  metricLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    minHeight: 46,
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  reloadButton: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  reloadText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  section: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 10,
  },
  selectionBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  selectionText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  switchBox: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    minHeight: 44,
    paddingHorizontal: 10,
  },
  switchLabel: {
    color: '#334155',
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
});
