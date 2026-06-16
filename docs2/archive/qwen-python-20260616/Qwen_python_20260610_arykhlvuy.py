# Crear app móvil (React Native + Expo)
app_movil_js = '''// ============================================================
// PLAN HAIKY - App Móvil (React Native + Expo)
// App.js - Componente Principal
// ============================================================
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
import MisNovedadesScreen from './screens/MisNovedadesScreen';
import PerfilScreen from './screens/PerfilScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Marcación" component={MarcacionScreen} options={{ title: 'Marcar' }} />
      <Tab.Screen name="Mis Marcaciones" component={MisMarcacionesScreen} />
      <Tab.Screen name="Novedades" component={MisNovedadesScreen} />
      <Tab.Screen name="Perfil" component={PerfilScreen} />
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

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('token');
    setToken(null);
  };

  if (cargando) {
    return null; // O un splash screen
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator>
          {token ? (
            <>
              <Stack.Screen name="Main" options={{ headerShown: false }}>
                {() => <MainTabs />}
              </Stack.Screen>
            </>
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
'''

with open('app-movil/src/App.js', 'w') as f:
    f.write(app_movil_js)

# Crear package.json de la app móvil
app_movil_package = '''{
  "name": "plan-haiky-app",
  "version": "1.0.0",
  "main": "src/App.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~50.0.0",
    "expo-status-bar": "~1.11.1",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-navigation/native": "^6.1.9",
    "@react-navigation/native-stack": "^6.9.17",
    "@react-navigation/bottom-tabs": "^6.5.11",
    "react-native-screens": "~3.29.0",
    "react-native-safe-area-context": "4.8.2",
    "expo-secure-store": "~12.8.1",
    "expo-location": "~16.5.2",
    "expo-camera": "~14.0.0",
    "axios": "^1.6.2"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  },
  "private": true
}
'''

with open('app-movil/package.json', 'w') as f:
    f.write(app_movil_package)

print("✓ App móvil creada (App.js y package.json)")
 # Result execute error ```