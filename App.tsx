import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Contextos
import { AuthProvider, useAuth } from './context/AuthContext';
import { CollectionProvider } from './context/CollectionContext';

// Pantallas
import { CardDetailScreen } from './screens/collection/CardDetailScreen';
import { CollectionScreen } from './screens/collection/CollectionScreen';
import { LoginScreen } from './screens/login/LoginScreen';
import { ScannerScreen } from './screens/scanner/ScannerScreen';
// Tipos
import { ArchetypeScreen } from './screens/collection/Archetypescreen';
import { RootStackParamList } from './types/navigation.types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const NavigationContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#001525' }}>
        <ActivityIndicator size="large" color="#fdf0d5" />
        <Text style={{ color: '#fdf0d5', marginTop: 20 }}>Iniciando...</Text>
      </View>
    );
  }

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
            <Stack.Screen
              name="ArchetypeCards"
              component={ArchetypeScreen}
              options={{ animation: 'slide_from_right' }}
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
    <SafeAreaProvider>
      <AuthProvider>
        <CollectionProvider>
          <NavigationContent />
        </CollectionProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}