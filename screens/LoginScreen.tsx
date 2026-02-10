import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

// --- PALETA ONE PIECE ---
const THEME = {
  deepOcean: "#001525",
  navy: "#003049",
  cream: "#fdf0d5",
  gold: "#FFD700",
  red: "#c1121f",
  glass: "rgba(0, 20, 35, 0.75)",
  glassBorder: "rgba(253, 240, 213, 0.3)",
  textDim: "rgba(253, 240, 213, 0.5)",
};

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false); // false = Login, true = Registro

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('¡Alto ahí!', 'Necesito tu correo y contraseña para dejarte pasar.');
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // REGISTRO
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert('¡Bienvenido a bordo!', 'Revisa tu correo de inmediato para confirmar tu cuenta.');
      } else {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert('Error en la cubierta', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[THEME.deepOcean, THEME.navy, '#1e4d6b']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        
        {/* 1. HEADER / LOGO */}
        <View style={styles.logoContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.logoIcon}>☠️</Text>
          </View>
          <Text style={styles.appTitle}>OP TCG</Text>
          <Text style={styles.appSubtitle}>COLLECTOR'S LOG</Text>
        </View>

        {/* 2. TARJETA DE LOGIN (Glassmorphism) */}
        <View style={styles.glassCard}>
          
          {/* TÍTULO DINÁMICO */}
          <Text style={styles.cardTitle}>
            {isSignUp ? 'RECLUTAMIENTO' : 'IDENTIFICACIÓN'}
          </Text>

          {/* INPUTS */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>NAKAMA ID (EMAIL)</Text>
            <TextInput
              style={styles.input}
              placeholder="luffy@sunny.go"
              placeholderTextColor={THEME.textDim}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>CLAVE SECRETA</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={THEME.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {/* BOTÓN PRINCIPAL */}
          <Pressable 
            style={({pressed}) => [styles.mainButton, pressed && styles.btnPressed]}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={THEME.navy} />
            ) : (
              <Text style={styles.mainButtonText}>
                {isSignUp ? 'UNIRSE A LA BANDA' : 'ZARPAR'}
              </Text>
            )}
          </Pressable>

          {/* SEPARADOR */}
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>O</Text>
            <View style={styles.line} />
          </View>

          {/* BOTÓN SECUNDARIO (Toggle) */}
          <Pressable 
            onPress={() => setIsSignUp(!isSignUp)} 
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              {isSignUp 
                ? '¿Ya tienes cuenta? Inicia Sesión' 
                : '¿Nuevo pirata? Regístrate'}
            </Text>
          </Pressable>
        </View>

      </KeyboardAvoidingView>
      
      {/* Footer Decorativo */}
      <Text style={styles.footerText}>DEV.KOMP CORP © 2024</Text>

    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  
  // LOGO
  logoContainer: { alignItems: 'center', marginBottom: 30 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: THEME.cream,
    marginBottom: 16,
    shadowColor: THEME.gold, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 10,
  },
  logoIcon: { fontSize: 40 },
  appTitle: { color: THEME.cream, fontSize: 36, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  appSubtitle: { color: THEME.gold, fontSize: 10, fontWeight: 'bold', letterSpacing: 6, marginTop: 4 },

  // CARD
  glassCard: {
    backgroundColor: THEME.glass,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: THEME.glassBorder,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20,
  },
  cardTitle: { color: THEME.cream, fontSize: 14, fontWeight: 'bold', letterSpacing: 2, textAlign: 'center', marginBottom: 24, opacity: 0.9 },

  // INPUTS
  inputContainer: { marginBottom: 16 },
  label: { color: THEME.gold, fontSize: 9, fontWeight: '800', marginBottom: 6, letterSpacing: 0.5, marginLeft: 4 },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: THEME.cream,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    fontSize: 16,
    fontWeight: '500',
  },

  // BOTONES
  mainButton: {
    backgroundColor: THEME.cream,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: THEME.gold, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  btnPressed: { transform: [{scale: 0.98}], opacity: 0.9 },
  mainButtonText: { color: THEME.navy, fontWeight: '900', fontSize: 14, letterSpacing: 1.5 },

  // DIVIDER
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  line: { flex: 1, height: 1, backgroundColor: 'rgba(253, 240, 213, 0.1)' },
  orText: { color: 'rgba(253, 240, 213, 0.3)', paddingHorizontal: 10, fontSize: 10, fontWeight: 'bold' },

  // SECONDARY
  secondaryButton: { alignItems: 'center', paddingVertical: 8 },
  secondaryText: { color: THEME.gold, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' },

  footerText: {
    position: 'absolute', bottom: 30, width: '100%', textAlign: 'center',
    color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '600', letterSpacing: 1
  }
});