import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mobileAPI } from '../services/api';
import { currentPeriodEC } from '../utils/dateEC';

const MONTH_LABELS = [
  '',
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const moneyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  const amount = Number(value || 0);
  return moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

export default function AutoservicioScreen() {
  const currentPeriod = useMemo(() => currentPeriodEC(), []);
  const [activeTab, setActiveTab] = useState('roles');
  const [period, setPeriod] = useState(currentPeriod);
  const [employee, setEmployee] = useState(null);
  const [nomina, setNomina] = useState(null);
  const [history, setHistory] = useState({ novedades: [], documentos: [], permisos: [] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const canGoForward = period.year < currentPeriod.year
    || (period.year === currentPeriod.year && period.month < currentPeriod.month);

  const goPreviousPeriod = useCallback(() => {
    setPeriod((value) => (
      value.month === 1
        ? { year: value.year - 1, month: 12 }
        : { year: value.year, month: value.month - 1 }
    ));
  }, []);

  const goNextPeriod = useCallback(() => {
    if (!canGoForward) return;
    setPeriod((value) => (
      value.month === 12
        ? { year: value.year + 1, month: 1 }
        : { year: value.year, month: value.month + 1 }
    ));
  }, [canGoForward]);

  useEffect(() => {
    setLoading(true);
    setError('');
    async function load() {
      try {
        const [profile, payroll, historyResponse] = await Promise.all([
          mobileAPI.me(),
          mobileAPI.payroll(period.year, period.month),
          mobileAPI.history(),
        ]);
        setEmployee(profile.data.employee);
        setNomina(payroll.data.nomina);
        setHistory(historyResponse.data.history || { novedades: [], documentos: [], permisos: [] });
      } catch (err) {
        setNomina(null);
        setError(err.response?.data?.message || 'No pudimos cargar tu autoservicio.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period.year, period.month]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Autoservicio</Text>
      <Text style={styles.title}>Mi Nómina</Text>

      <View style={styles.tabs}>
        {[
          ['roles', 'Mis roles'],
          ['novedades', 'Novedades'],
          ['perfil', 'Mi perfil'],
        ].map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => setActiveTab(id)}
            style={[styles.tab, activeTab === id && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#0f766e" />
          <Text style={styles.loading}>Cargando autoservicio...</Text>
        </View>
      ) : null}

      {!loading && activeTab === 'roles' && (
        <View style={styles.card}>
          <Text style={styles.label}>Rol de pagos</Text>
          <View style={styles.periodRow}>
            <TouchableOpacity onPress={goPreviousPeriod} style={styles.periodButton}>
              <Text style={styles.periodButtonText}>Anterior</Text>
            </TouchableOpacity>
            <Text style={styles.periodText}>{MONTH_LABELS[period.month]} {period.year}</Text>
            <TouchableOpacity disabled={!canGoForward} onPress={goNextPeriod} style={[styles.periodButton, !canGoForward && styles.periodButtonDisabled]}>
              <Text style={[styles.periodButtonText, !canGoForward && styles.periodButtonTextDisabled]}>Siguiente</Text>
            </TouchableOpacity>
          </View>
          {nomina ? (
            <>
              <Text style={styles.money}>{formatMoney(nomina.neto_recibir)}</Text>
              <Text style={styles.detail}>Ingresos {formatMoney(nomina.total_ingresos)}</Text>
              <Text style={styles.detail}>Deducciones {formatMoney(nomina.total_deducciones)}</Text>
              <Text style={styles.detail}>Estado {nomina.estado}</Text>
              {nomina.id && (
                <TouchableOpacity
                  style={styles.pdfButton}
                  onPress={async () => {
                    try {
                      const response = await mobileAPI.payrollPdf(nomina.id);
                      const url = response.data?.url;
                      if (url) {
                        await Linking.openURL(url);
                      } else {
                        Alert.alert('PDF no disponible', 'El rol de pago aún no tiene PDF generado.');
                      }
                    } catch (err) {
                      Alert.alert('Error', err.response?.data?.message || 'No se pudo obtener el PDF.');
                    }
                  }}
                >
                  <Text style={styles.pdfButtonText}>Descargar PDF</Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <Text style={styles.detail}>El rol del período aún no está disponible.</Text>
          )}
        </View>
      )}

      {!loading && activeTab === 'novedades' && (
        <View style={styles.card}>
          <Text style={styles.label}>Novedades y permisos</Text>
          {(history.novedades || []).length === 0 ? (
            <Text style={styles.detail}>No hay novedades registradas en tu historial.</Text>
          ) : (
            (history.novedades || []).slice(0, 12).map((item) => (
              <View key={item.id} style={styles.historyItem}>
                <Text style={styles.historyTitle}>{String(item.tipo_novedad || '').replace(/_/g, ' ')}</Text>
                <Text style={styles.detail}>{String(item.fecha || '').slice(0, 10)} - {item.estado}</Text>
                <Text style={styles.detail}>{item.justificacion || 'Sin justificación'}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {!loading && activeTab === 'perfil' && (
        <View style={styles.card}>
          <Text style={styles.label}>Empleado</Text>
          <Text style={styles.name}>{employee ? `${employee.nombres} ${employee.apellidos}` : 'Sin empleado vinculado'}</Text>
          <Text style={styles.detail}>{employee?.cedula || ''}</Text>
          <Text style={styles.detail}>{employee?.cargo || 'Cargo no registrado'} | {employee?.departamento || 'Departamento no registrado'}</Text>
          <Text style={styles.detail}>
            Zona de marcación: {employee?.zona_marcacion ? `${employee.zona_marcacion.nombre} (${employee.zona_marcacion.codigo})` : 'No asignada'}
          </Text>
          <Text style={styles.detail}>
            Jornada: {employee?.jornada ? `${employee.jornada.nombre} ${employee.jornada.inicio}-${employee.jornada.fin}` : 'No asignada'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  center: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 20,
  },
  container: {
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  detail: {
    color: '#475569',
    fontSize: 14,
    marginTop: 4,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    color: '#991b1b',
    marginBottom: 12,
    padding: 12,
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  historyItem: {
    borderTopColor: '#e2e8f0',
    borderTopWidth: 1,
    paddingVertical: 10,
  },
  historyTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  loading: {
    color: '#64748b',
    marginTop: 10,
  },
  money: {
    color: '#0f766e',
    fontSize: 30,
    fontWeight: '900',
  },
  name: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  pdfButton: {
    alignItems: 'center',
    backgroundColor: '#0369a1',
    borderRadius: 8,
    marginTop: 12,
    minHeight: 40,
    justifyContent: 'center',
  },
  pdfButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  periodButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  periodButtonDisabled: {
    backgroundColor: '#e2e8f0',
  },
  periodButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  periodButtonTextDisabled: {
    color: '#94a3b8',
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  periodText: {
    color: '#0f172a',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  tab: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#0f766e',
    borderColor: '#0f766e',
  },
  tabText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 18,
    marginTop: 4,
  },
});
