import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  deleteGasto,
  getGastosByPeriodo,
  getTotalesByPeriodo,
  insertGasto,
  marcarGastosEnviados,
} from '../db/movilizacion';
import { mobileAPI } from '../services/api';

function datePart(type) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))[type];
}

function currentPeriodEC() {
  return `${datePart('year')}-${datePart('month')}`;
}

function todayEC() {
  return `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
}

const emptyForm = () => ({
  fecha: todayEC(),
  origen: '',
  destino: '',
  km: '',
  valor_usd: '',
  concepto: 'taxi',
});

export default function GastosMovilizacionScreen() {
  const periodo = currentPeriodEC();
  const [gastos, setGastos] = useState([]);
  const [totales, setTotales] = useState({ registros: 0, dias: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const recargar = useCallback(async () => {
    const [rows, summary] = await Promise.all([
      getGastosByPeriodo(periodo),
      getTotalesByPeriodo(periodo),
    ]);
    setGastos(rows);
    setTotales(summary || { registros: 0, dias: 0, total: 0 });
  }, [periodo]);

  useEffect(() => {
    recargar().finally(() => setLoading(false));
  }, [recargar]);

  const agregar = async () => {
    const valor = Number(form.valor_usd);
    if (!form.origen.trim() || !form.destino.trim() || !Number.isFinite(valor) || valor <= 0) {
      Alert.alert('Datos incompletos', 'Registra origen, destino y valor.');
      return;
    }
    await insertGasto({ ...form, valor_usd: valor, periodo });
    setForm(emptyForm());
    setModalVisible(false);
    await recargar();
  };

  const eliminar = (id) => {
    Alert.alert('Eliminar gasto', 'Este gasto pendiente se eliminara del informe.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteGasto(id);
          await recargar();
        },
      },
    ]);
  };

  const enviar = () => {
    const pendientes = gastos.filter((gasto) => gasto.estado === 'pendiente');
    if (pendientes.length === 0) {
      Alert.alert('Sin gastos pendientes', 'No hay gastos pendientes para enviar.');
      return;
    }
    Alert.alert('Enviar informe', `Se enviaran ${pendientes.length} gastos por $${Number(totales.total || 0).toFixed(2)}.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Enviar',
        onPress: async () => {
          setSaving(true);
          try {
            const response = await mobileAPI.sendMobilizationReport({
              periodo,
              total_usd: Number(totales.total || 0),
              dias: Number(totales.dias || pendientes.length),
              detalle: pendientes.map((gasto) => ({
                fecha: gasto.fecha,
                origen: gasto.origen,
                destino: gasto.destino,
                km: gasto.km,
                valor_usd: gasto.valor_usd,
                concepto: gasto.concepto,
              })),
            });
            await marcarGastosEnviados(periodo, response.data?.informeId || 'enviado');
            await recargar();
            Alert.alert('Informe enviado', 'Tu informe de movilizacion quedo pendiente de revision.');
          } catch (err) {
            Alert.alert('No se pudo enviar', err.response?.data?.message || 'Revisa tu conexion e intenta nuevamente.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#0f766e" />
        <Text style={styles.muted}>Cargando gastos...</Text>
      </View>
    );
  }

  const pendientes = gastos.some((gasto) => gasto.estado === 'pendiente');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Movilizacion</Text>
      <Text style={styles.subtitle}>Periodo {periodo}</Text>

      <View style={styles.summary}>
        <View>
          <Text style={styles.summaryValue}>{Number(totales.registros || 0)}</Text>
          <Text style={styles.summaryLabel}>registros</Text>
        </View>
        <View>
          <Text style={styles.summaryValue}>${Number(totales.total || 0).toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>total</Text>
        </View>
      </View>

      <FlatList
        data={gastos}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.empty}>Agrega tu primer gasto del mes.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.row, item.estado !== 'pendiente' && styles.sentRow]}>
            <View style={styles.rowBody}>
              <Text style={styles.route}>{item.origen} -> {item.destino}</Text>
              <Text style={styles.detail}>{item.fecha} · {item.concepto} · {item.estado}</Text>
            </View>
            <Text style={styles.amount}>${Number(item.valor_usd || 0).toFixed(2)}</Text>
            {item.estado === 'pendiente' && (
              <TouchableOpacity onPress={() => eliminar(item.id)} style={styles.removeButton}>
                <Text style={styles.removeText}>X</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.secondaryText}>Agregar gasto</Text>
        </TouchableOpacity>
        {pendientes && (
          <TouchableOpacity disabled={saving} style={styles.primaryButton} onPress={enviar}>
            <Text style={styles.primaryText}>{saving ? 'Enviando...' : 'Enviar informe'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.overlay}>
          <ScrollView style={styles.modal}>
            <Text style={styles.modalTitle}>Nuevo gasto</Text>
            {[
              ['fecha', 'Fecha'],
              ['origen', 'Origen'],
              ['destino', 'Destino'],
              ['valor_usd', 'Valor USD'],
              ['km', 'Km opcional'],
              ['concepto', 'Concepto'],
            ].map(([key, label]) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  keyboardType={['valor_usd', 'km'].includes(key) ? 'decimal-pad' : 'default'}
                  onChangeText={(value) => setForm((current) => ({ ...current, [key]: value }))}
                  style={styles.input}
                  value={form[key]}
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={agregar}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 8, marginTop: 8 },
  amount: { color: '#0f766e', fontSize: 14, fontWeight: '800', marginRight: 8 },
  cancelButton: { alignItems: 'center', borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, flex: 1, minHeight: 44, justifyContent: 'center' },
  cancelText: { color: '#334155', fontWeight: '800' },
  center: { alignItems: 'center', backgroundColor: '#f8fafc', flex: 1, justifyContent: 'center' },
  container: { backgroundColor: '#f8fafc', flex: 1, padding: 16 },
  detail: { color: '#64748b', fontSize: 11, marginTop: 2 },
  empty: { color: '#64748b', marginTop: 32, textAlign: 'center' },
  field: { marginBottom: 12 },
  input: { backgroundColor: '#fff', borderColor: '#cbd5e1', borderRadius: 8, borderWidth: 1, minHeight: 44, paddingHorizontal: 12 },
  label: { color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '86%', padding: 16 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modalTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  muted: { color: '#64748b', marginTop: 8 },
  overlay: { backgroundColor: 'rgba(15, 23, 42, 0.35)', flex: 1, justifyContent: 'flex-end' },
  primaryButton: { alignItems: 'center', backgroundColor: '#0f766e', borderRadius: 8, minHeight: 46, justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  removeButton: { alignItems: 'center', backgroundColor: '#fee2e2', borderRadius: 14, height: 28, justifyContent: 'center', width: 28 },
  removeText: { color: '#b91c1c', fontWeight: '900' },
  route: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  row: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, flexDirection: 'row', marginBottom: 8, padding: 12 },
  rowBody: { flex: 1 },
  saveButton: { alignItems: 'center', backgroundColor: '#0f766e', borderRadius: 8, flex: 1, minHeight: 44, justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
  secondaryButton: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#0f766e', borderRadius: 8, borderWidth: 1, minHeight: 46, justifyContent: 'center' },
  secondaryText: { color: '#0f766e', fontWeight: '900' },
  sentRow: { opacity: 0.62 },
  subtitle: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  summary: { backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', gap: 40, marginBottom: 12, padding: 16 },
  summaryLabel: { color: '#64748b', fontSize: 11 },
  summaryValue: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
  title: { color: '#0f172a', fontSize: 22, fontWeight: '900' },
});
