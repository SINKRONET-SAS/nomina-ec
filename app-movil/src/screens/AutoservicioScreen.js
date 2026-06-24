import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { mobileAPI } from '../services/api';

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

function currentPeriodEC() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
  };
}

export default function AutoservicioScreen() {
  const currentPeriod = useMemo(() => currentPeriodEC(), []);
  const [period, setPeriod] = useState(currentPeriod);
  const [employee, setEmployee] = useState(null);
  const [nomina, setNomina] = useState(null);
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
        const [profile, payroll] = await Promise.all([
          mobileAPI.me(),
          mobileAPI.payroll(period.year, period.month),
        ]);
        setEmployee(profile.data.employee);
        setNomina(payroll.data.nomina);
      } catch (err) {
        setEmployee((current) => current);
        setNomina(null);
        setError(err.response?.data?.message || 'No pudimos cargar tu autoservicio.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [period.year, period.month]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" />
        <Text style={styles.loading}>Cargando autoservicio...</Text>
      </View>
    );
  }

  const zonaMarcacion = employee?.zona_marcacion;

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Autoservicio</Text>
      <Text style={styles.title}>Mi información</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>Empleado</Text>
        <Text style={styles.name}>{employee ? `${employee.nombres} ${employee.apellidos}` : 'Sin empleado vinculado'}</Text>
        <Text style={styles.detail}>{employee?.cedula || ''}</Text>
        <Text style={styles.detail}>{employee?.cargo || 'Cargo no registrado'} | {employee?.departamento || 'Departamento no registrado'}</Text>
        <Text style={styles.detail}>
          Zona de marcación: {zonaMarcacion ? `${zonaMarcacion.nombre} (${zonaMarcacion.codigo})` : 'No asignada'}
        </Text>
      </View>

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
        {loading ? (
          <Text style={styles.detail}>Cargando rol de pagos...</Text>
        ) : nomina ? (
          <>
            <Text style={styles.money}>${Number(nomina.neto_recibir || 0).toFixed(2)}</Text>
            <Text style={styles.detail}>Ingresos ${Number(nomina.total_ingresos || 0).toFixed(2)}</Text>
            <Text style={styles.detail}>Deducciones ${Number(nomina.total_deducciones || 0).toFixed(2)}</Text>
            <Text style={styles.detail}>Estado {nomina.estado}</Text>
          </>
        ) : (
          <Text style={styles.detail}>El rol del periodo aún no está disponible.</Text>
        )}
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
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  periodRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    marginBottom: 12,
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
  periodText: {
    color: '#0f172a',
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  name: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  money: {
    color: '#0f766e',
    fontSize: 30,
    fontWeight: '900',
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
  loading: {
    color: '#64748b',
    marginTop: 10,
  },
});
