import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CollectionProvider } from './context/CollectionContext'; // <--- NUEVO
import { CollectionScreen } from './screens/CollectionScreen';
import { LoginScreen } from './screens/LoginScreen';
import { ScannerScreen } from './screens/ScannerScreen';
import { RootStackParamList } from './types/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const Navigation = () => {
  const { user, loading } = useAuth();

  if (loading) return null; // O un Splash Screen bonito

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // STACK DE USUARIO AUTENTICADO
          <>
            <Stack.Screen name="Scanner" component={ScannerScreen} />
            <Stack.Screen name="Collection" component={CollectionScreen} />
          </>
        ) : (
          // STACK DE LOGIN
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      {/* El CollectionProvider debe ir DENTRO del AuthProvider para acceder al user */}
      <CollectionProvider>
        <Navigation />
      </CollectionProvider>
    </AuthProvider>
  );
}