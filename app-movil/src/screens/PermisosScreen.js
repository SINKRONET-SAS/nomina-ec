import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { mobileAPI } from '../services/api';
import { todayEC } from '../utils/dateEC';

const SUPPORT_MAX_BYTES = 3 * 1024 * 1024;

export default function PermisosScreen() {
  const today = useMemo(() => todayEC(), []);
  const [form, setForm] = useState({
    fechaInicio: today,
    fechaFin: today,
    remunerado: true,
    horasDia: '8',
    motivo: '',
    soporteMedico: null,
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function loadHistory() {
    setLoading(true);
    try {
      const response = await mobileAPI.history();
      setHistory(response.data?.history?.permisos || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos cargar tus permisos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  function updateField(name, value) {
    setMessage('');
    setError('');
    setForm((current) => ({ ...current, [name]: value }));
  }

  function supportSizeLabel(sizeBytes) {
    const size = Number(sizeBytes || 0);
    if (!Number.isFinite(size) || size <= 0) return '';
    return `${(size / 1024 / 1024).toFixed(2)} MB`;
  }

  function estimatedBase64Bytes(base64) {
    const clean = String(base64 || '').replace(/=+$/, '');
    return Math.floor((clean.length * 3) / 4);
  }

  async function pickSupport() {
    setMessage('');
    setError('');
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Activa el permiso de galeria para adjuntar el soporte medico.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      });

      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) {
        setError('No pudimos leer el soporte seleccionado.');
        return;
      }

      const contentType = asset.mimeType || (String(asset.fileName || '').toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');
      const sizeBytes = asset.fileSize || estimatedBase64Bytes(asset.base64);
      if (sizeBytes > SUPPORT_MAX_BYTES) {
        setError('El soporte debe pesar hasta 3 MB.');
        return;
      }

      updateField('soporteMedico', {
        fileName: asset.fileName || `soporte_permiso_${today}.jpg`,
        contentType,
        base64: asset.base64,
        sizeBytes,
      });
    } catch (err) {
      console.error('[PERMISOS] Error seleccionando soporte medico', {
        code: err.code || 'PERMISO_SOPORTE_PICKER_ERROR',
        statusCode: err.statusCode || 500,
        message: err.message,
      });
      setError('No pudimos adjuntar el soporte medico.');
    }
  }

  async function submit() {
    setSubmitting(true);
    setMessage('');
    setError('');
    try {
      const horas = Math.max(0, Number(form.horasDia || 0));
      const payload = {
        fechaInicio: form.fechaInicio,
        fechaFin: form.fechaFin,
        remunerado: form.remunerado,
        minutos: Math.round(horas * 60),
        motivo: form.motivo,
        ...(form.soporteMedico ? { soporteMedico: form.soporteMedico } : {}),
      };
      const response = await mobileAPI.requestPermission(payload);
      setMessage(`Solicitud registrada: ${response.data?.permiso?.totalDias || 1} día(s) pendiente(s).`);
      setForm((current) => ({ ...current, motivo: '', soporteMedico: null }));
      await loadHistory();
    } catch (err) {
      setError(err.response?.data?.message || 'No pudimos registrar la solicitud de permiso.');
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || !form.fechaInicio || !form.fechaFin || !form.motivo.trim();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Permisos</Text>
      <Text style={styles.title}>Solicitar permiso</Text>

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.label}>Fecha inicio</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          onChangeText={(value) => updateField('fechaInicio', value)}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          value={form.fechaInicio}
        />

        <Text style={styles.label}>Fecha fin</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
          onChangeText={(value) => updateField('fechaFin', value)}
          placeholder="YYYY-MM-DD"
          style={styles.input}
          value={form.fechaFin}
        />

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.label}>Remunerado</Text>
            <Text style={styles.detail}>{form.remunerado ? 'Permiso con sueldo' : 'Permiso sin sueldo'}</Text>
          </View>
          <Switch
            onValueChange={(value) => updateField('remunerado', value)}
            value={form.remunerado}
          />
        </View>

        <Text style={styles.label}>Horas por día</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={(value) => updateField('horasDia', value)}
          style={styles.input}
          value={form.horasDia}
        />

        <Text style={styles.label}>Motivo</Text>
        <TextInput
          multiline
          onChangeText={(value) => updateField('motivo', value)}
          placeholder="Describe el respaldo del permiso"
          style={[styles.input, styles.textarea]}
          value={form.motivo}
        />

        <Text style={styles.label}>Soporte médico (opcional)</Text>
        <View style={styles.supportBox}>
          {form.soporteMedico ? (
            <View>
              <Text style={styles.supportName}>{form.soporteMedico.fileName}</Text>
              <Text style={styles.detail}>{supportSizeLabel(form.soporteMedico.sizeBytes)} - listo para enviar</Text>
            </View>
          ) : (
            <Text style={styles.detail}>Adjunta una imagen JPG o PNG hasta 3 MB.</Text>
          )}
          <View style={styles.supportActions}>
            <TouchableOpacity onPress={pickSupport} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{form.soporteMedico ? 'Cambiar' : 'Adjuntar'}</Text>
            </TouchableOpacity>
            {form.soporteMedico ? (
              <TouchableOpacity onPress={() => updateField('soporteMedico', null)} style={styles.ghostButton}>
                <Text style={styles.ghostButtonText}>Quitar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <TouchableOpacity disabled={disabled} onPress={submit} style={[styles.button, disabled && styles.buttonDisabled]}>
          <Text style={styles.buttonText}>{submitting ? 'Enviando...' : 'Enviar solicitud'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Historial de permisos</Text>
        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#0f766e" />
            <Text style={styles.detail}>Cargando permisos...</Text>
          </View>
        ) : history.length === 0 ? (
          <Text style={styles.detail}>Aún no tienes permisos registrados.</Text>
        ) : (
          history.slice(0, 8).map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <Text style={styles.historyTitle}>{String(item.tipo_novedad || '').replace(/_/g, ' ')}</Text>
              <Text style={styles.detail}>{String(item.fecha || '').slice(0, 10)} - {item.estado}</Text>
              <Text style={styles.detail}>{item.justificacion || 'Sin justificación'}</Text>
              {item.metadata?.soporteMedico ? <Text style={styles.supportBadge}>Soporte adjunto</Text> : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    marginTop: 16,
    minHeight: 46,
    justifyContent: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  container: {
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  detail: {
    color: '#475569',
    fontSize: 14,
    marginTop: 3,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    color: '#991b1b',
    marginBottom: 12,
    padding: 12,
  },
  ghostButton: {
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ghostButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '800',
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
  input: {
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    marginBottom: 12,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  label: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#ccfbf1',
    borderRadius: 8,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '800',
  },
  success: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    color: '#065f46',
    marginBottom: 12,
    padding: 12,
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  supportActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  supportBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  supportBox: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10,
  },
  supportName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  textarea: {
    minHeight: 90,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  title: {
    color: '#0f172a',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 18,
    marginTop: 4,
  },
});
