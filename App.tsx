// App.tsx
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React from 'react';
import { CollectionScreen } from './screens/CollectionScreen';
import { ScannerScreen } from './screens/ScannerScreen';
import { RootStackParamList } from './types/navigation.types';
import { COLORS } from './utils/constants';

const Stack = createStackNavigator<RootStackParamList>();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.background,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Scanner" 
          component={ScannerScreen}
          options={{ 
            title: 'OPTCG Scanner',
            headerShown: false 
          }}
        />
        <Stack.Screen 
          name="Collection" 
          component={CollectionScreen}
          options={{ title: 'Colección' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;