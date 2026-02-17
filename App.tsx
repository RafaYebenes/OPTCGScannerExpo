import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, StatusBar, Text, View } from 'react-native';

// Contextos
import { AuthProvider, useAuth } from './context/AuthContext';
import { CollectionProvider } from './context/CollectionContext';

// Pantallas
import { CardDetailScreen } from './screens/collection/CardDetailScreen';
import { CollectionScreen } from './screens/collection/CollectionScreen';
import { LoginScreen } from './screens/login/LoginScreen';
import { ScannerScreen } from './screens/scanner/ScannerScreen';

// Tipos
import { RootStackParamList } from './types/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NavigationContent = () => {
  const { user, loading } = useAuth();

  // 1. SI ESTÁ CARGANDO -> SPINNER
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001525' }}>
        <ActivityIndicator size="large" color="#fdf0d5" />
        <Text style={{ color: '#fdf0d5', marginTop: 20 }}>Iniciando...</Text>
      </View>
    );
  }

  // 2. SI YA TERMINÓ DE CARGAR -> NAVEGACIÓN
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Scanner" component={ScannerScreen} />
            <Stack.Screen name="Collection" component={CollectionScreen} />
            <Stack.Screen 
              name="CardDetail" 
              component={CardDetailScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CollectionProvider>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <NavigationContent />
      </CollectionProvider>
    </AuthProvider>
  );
}