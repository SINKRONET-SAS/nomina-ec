import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { mobileAPI } from '../services/api';

export default function AutoservicioScreen() {
  const today = new Date();
  const [employee, setEmployee] = useState(null);
  const [nomina, setNomina] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profile, payroll] = await Promise.all([
          mobileAPI.me(),
          mobileAPI.payroll(today.getFullYear(), today.getMonth() + 1),
        ]);
        setEmployee(profile.data.employee);
        setNomina(payroll.data.nomina);
      } catch (err) {
        setError(err.response?.data?.message || 'No pudimos cargar tu autoservicio.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" />
        <Text style={styles.loading}>Cargando autoservicio...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Autoservicio</Text>
      <Text style={styles.title}>Mi informacion</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>Empleado</Text>
        <Text style={styles.name}>{employee ? `${employee.nombres} ${employee.apellidos}` : 'Sin empleado vinculado'}</Text>
        <Text style={styles.detail}>{employee?.cedula || ''}</Text>
        <Text style={styles.detail}>{employee?.cargo || 'Cargo no registrado'} | {employee?.departamento || 'Departamento no registrado'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Rol del periodo actual</Text>
        {nomina ? (
          <>
            <Text style={styles.money}>${Number(nomina.neto_recibir || 0).toFixed(2)}</Text>
            <Text style={styles.detail}>Ingresos ${Number(nomina.total_ingresos || 0).toFixed(2)}</Text>
            <Text style={styles.detail}>Deducciones ${Number(nomina.total_deducciones || 0).toFixed(2)}</Text>
            <Text style={styles.detail}>Estado {nomina.estado}</Text>
          </>
        ) : (
          <Text style={styles.detail}>El rol del periodo aun no esta disponible.</Text>
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
