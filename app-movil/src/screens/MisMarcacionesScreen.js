// ============================================================
// PLAN HAIKY - Pantalla Mis Marcaciones (App MÃ³vil)
// ============================================================
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://10.0.2.2:3000/api';

export default function MisMarcacionesScreen() {
  const [marcaciones, setMarcaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    cargarMarcaciones();
  }, []);

  const cargarMarcaciones = async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const response = await axios.get(`${API_URL}/marcaciones/empleado/${payload.userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMarcaciones(response.data.marcaciones || []);
    } catch (err) {
      console.error('Error cargando marcaciones:', err);
    } finally {
      setCargando(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await cargarMarcaciones();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <View style={styles.itemHeader}>
        <Text style={styles.tipo}>
          {item.tipo_marcacion.replace('_', ' ').toUpperCase()}
        </Text>
        <View style={[styles.badge, item.es_valida ? styles.badgeValid : styles.badgeInvalid]}>
          <Text style={styles.badgeText}>
            {item.es_valida ? 'VÃLIDA' : 'INVÃLIDA'}
          </Text>
        </View>
      </View>
      <Text style={styles.fecha}>
        {new Date(item.timestamp).toLocaleString('es-EC')}
      </Text>
      {item.distancia_metros && (
        <Text style={styles.distancia}>
          Distancia: {parseInt(item.distancia_metros)}m
        </Text>
      )}
      {item.foto_url && (
        <Text style={styles.foto}>ðŸ“· Foto adjunta</Text>
      )}
    </View>
  );

  if (cargando) {
    return (
      <View style={styles.container}>
        <Text style={styles.loading}>Cargando marcaciones...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Marcaciones</Text>
      
      <FlatList
        data={marcaciones}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No hay marcaciones registradas</Text>
        }
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1f2937',
  },
  loading: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 50,
  },
  list: {
    paddingBottom: 20,
  },
  item: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  tipo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeValid: {
    backgroundColor: '#d1fae5',
  },
  badgeInvalid: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  fecha: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 3,
  },
  distancia: {
    fontSize: 12,
    color: '#6b7280',
  },
  foto: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 50,
  },
});

