import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { mobileAPI } from '../services/api';

function MarkItem({ item }) {
  return (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.tipo}>{String(item.tipo_marcacion || '').replace(/_/g, ' ').toUpperCase()}</Text>
        <Text style={styles.badge}>{item.dentro_perimetro === false ? 'FUERA' : 'VALIDA'}</Text>
      </View>
      <Text style={styles.fecha}>{new Date(item.timestamp).toLocaleString('es-EC')}</Text>
      <Text style={styles.detail}>Distancia: {Number(item.distancia_metros || 0).toFixed(0)} m</Text>
    </View>
  );
}

function NoveltyItem({ item }) {
  return (
    <View style={styles.novelty}>
      <Text style={styles.tipo}>{String(item.tipo_novedad || '').replace(/_/g, ' ').toUpperCase()}</Text>
      <Text style={styles.fecha}>{String(item.fecha).slice(0, 10)} | {item.estado}</Text>
      <Text style={styles.detail}>{item.justificacion || 'Sin detalle'}</Text>
    </View>
  );
}

export default function MisMarcacionesScreen() {
  const [marcaciones, setMarcaciones] = useState([]);
  const [novedades, setNovedades] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cargarResumen = async () => {
    try {
      const response = await mobileAPI.attendanceSummary();
      setMarcaciones(response.data.marcaciones || []);
      setNovedades(response.data.novedades || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos cargar tu historial.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarResumen();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarResumen();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.loading}>Cargando historial...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={marcaciones}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <MarkItem item={item} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={(
        <View>
          <Text style={styles.title}>Mi asistencia</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.sectionTitle}>Marcaciones recientes</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No hay marcaciones registradas</Text>}
      ListFooterComponent={(
        <View style={styles.footer}>
          <Text style={styles.sectionTitle}>Novedades recientes</Text>
          {novedades.length === 0 ? (
            <Text style={styles.empty}>No hay novedades registradas</Text>
          ) : novedades.map((item) => <NoveltyItem item={item} key={item.id} />)}
        </View>
      )}
      contentContainerStyle={styles.container}
    />
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
    padding: 20,
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 6,
  },
  item: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  novelty: {
    backgroundColor: '#ffffff',
    borderColor: '#dbeafe',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  tipo: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#ecfdf5',
    borderRadius: 999,
    color: '#047857',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  fecha: {
    color: '#475569',
    fontSize: 13,
  },
  detail: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    color: '#991b1b',
    marginBottom: 12,
    padding: 12,
  },
  empty: {
    color: '#64748b',
    marginBottom: 12,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 24,
    paddingTop: 16,
  },
  loading: {
    color: '#64748b',
  },
});
