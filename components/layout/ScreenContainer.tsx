/**
 * ScreenContainer
 * ───────────────────────────────────────────────────────────────────────────
 * Wrapper reutilizable que unifica safe-area + padding estándar en toda la app.
 *
 * Uso básico:
 *   <ScreenContainer>...</ScreenContainer>
 *
 * Con scroll:
 *   <ScreenContainer scroll>...</ScreenContainer>
 *
 * Con fondo personalizado (gradiente externo):
 *   <ScreenContainer bg="transparent" edges={['bottom']}>...</ScreenContainer>
 *
 * Props:
 *   children     – contenido de la pantalla
 *   edges        – qué lados aplica safe-area (default: todos)
 *   bg           – color de fondo (default: PALETTE.deepOcean)
 *   padding      – padding horizontal (default: SPACING.screen)
 *   paddingTop   – padding top extra sobre el safe-area (default: 0)
 *   scroll       – envuelve en ScrollView si la pantalla lo necesita
 *   style        – estilos extra para el contenedor raíz
 *   contentStyle – estilos extra para el contenedor interior (útil con scroll)
 * ───────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { PALETTE } from '../../utils/theme';

// ─── Tokens de diseño ────────────────────────────────────────────────────────
export const SCREEN_SPACING = {
  horizontal: 16,   // Padding horizontal estándar de todas las pantallas
  verticalTop: 0,   // Extra sobre el safe-area top (personalizable por pantalla)
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ScreenContainerProps {
  children: React.ReactNode;
  /** Lados donde se aplica el inset de safe-area. Default: todos. */
  edges?: Edge[];
  /** Color de fondo. Default: PALETTE.deepOcean */
  bg?: string;
  /** Padding horizontal. Default: SCREEN_SPACING.horizontal */
  padding?: number;
  /** Padding top adicional (sobre el inset de safe-area). Default: 0 */
  paddingTop?: number;
  /** Si true, envuelve el contenido en un ScrollView */
  scroll?: boolean;
  /** Estilos extra para el SafeAreaView raíz */
  style?: ViewStyle;
  /** Estilos extra para el View/ScrollView interior */
  contentStyle?: ViewStyle;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  bg = PALETTE.deepOcean,
  padding = SCREEN_SPACING.horizontal,
  paddingTop = SCREEN_SPACING.verticalTop,
  scroll = false,
  style,
  contentStyle,
}) => {
  const innerStyle: ViewStyle = {
    flex: 1,
    paddingHorizontal: padding,
    paddingTop,
  };

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: bg }, style]}
    >
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />

      {scroll ? (
        <ScrollView
          style={styles.fill}
          contentContainerStyle={[innerStyle, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.fill, innerStyle, contentStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
});