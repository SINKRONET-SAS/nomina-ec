import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[SKNOMINA] Error no capturado:', {
      code: 'REACT_ERROR_BOUNDARY',
      statusCode: 500,
      correlationId: 'mobile-local',
      userId: null,
      message: error?.message,
      componentStack: info?.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.eyebrow}>SKNOMINA</Text>
          <Text style={styles.title}>Ocurrió un error</Text>
          <Text style={styles.detail}>
            La aplicación encontró un problema inesperado. Intenta reiniciar.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: '#0f766e',
    borderRadius: 8,
    marginTop: 20,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  detail: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    textAlign: 'center',
  },
  eyebrow: {
    color: '#0f766e',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 8,
  },
});
