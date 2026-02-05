import React, { useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DetectionState } from '../types/card.types';
import { COLORS, SCANNER_CONFIG } from '../utils/constants';

interface Props {
  detectionState: DetectionState;
}

export const DetectionFeedback: React.FC<Props> = ({ detectionState }) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (detectionState.lastSavedCode) {
      scale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withTiming(1, { duration: SCANNER_CONFIG.SUCCESS_DISPLAY_MS }),
        withTiming(0, { duration: 300 })
      );
    } else if (detectionState.isDetecting) {
      scale.value = withSpring(1);
      opacity.value = withTiming(1);
    } else {
      scale.value = withTiming(0);
      opacity.value = withTiming(0);
    }
  }, [detectionState, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!detectionState.isDetecting && !detectionState.lastSavedCode) {
    return null;
  }

  const isSuccess = !!detectionState.lastSavedCode;
  const progress = detectionState.confirmationCount / SCANNER_CONFIG.CONFIRMATION_THRESHOLD;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View style={[
        styles.feedback,
        isSuccess && styles.feedbackSuccess
      ]}>
        {isSuccess ? (
          <>
            <Text style={styles.icon}>✓</Text>
            <Text style={styles.text}>
              {detectionState.lastSavedCode}
            </Text>
            <Text style={styles.subtext}>Guardada correctamente</Text>
          </>
        ) : (
          <>
            <Text style={styles.text}>
              {detectionState.currentCode}
            </Text>
            <View style={styles.progressContainer}>
              <View 
                style={[
                  styles.progressBar,
                  { width: `${progress * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.subtext}>
              {detectionState.confirmationCount} / {SCANNER_CONFIG.CONFIRMATION_THRESHOLD}
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  feedback: {
    backgroundColor: COLORS.overlay,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 200,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  feedbackSuccess: {
    backgroundColor: 'rgba(0, 255, 0, 0.2)',
    borderColor: COLORS.success,
  },
  icon: {
    fontSize: 48,
    marginBottom: 10,
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    color: '#ccc',
    fontSize: 14,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 10,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.success,
    borderRadius: 4,
  },
});