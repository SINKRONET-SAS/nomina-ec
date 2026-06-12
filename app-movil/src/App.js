// Nómina-Ec - App móvil (React Native + Expo)
// App.js - Componente principal
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

import LoginScreen from './screens/LoginScreen';
import MarcacionScreen from './screens/MarcacionScreen';
import MisMarcacionesScreen from './screens/MisMarcacionesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Marcación" component={MarcacionScreen} />
      <Tab.Screen name="Mis Marcaciones" component={MisMarcacionesScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [token, setToken] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarToken();
  }, []);

  const cargarToken = async () => {
    try {
      const storedToken = await SecureStore.getItemAsync('token');
      setToken(storedToken);
    } catch (err) {
      console.error('Error cargando token:', err);
    } finally {
      setCargando(false);
    }
  };

  const handleLogin = async (newToken) => {
    await SecureStore.setItemAsync('token', newToken);
    setToken(newToken);
  };

  if (cargando) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator>
          {token ? (
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          ) : (
            <Stack.Screen name="Login" options={{ headerShown: false }}>
              {() => <LoginScreen onLogin={handleLogin} />}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
