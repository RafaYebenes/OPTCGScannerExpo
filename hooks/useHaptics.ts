// hooks/useHaptics.ts
import * as Haptics from 'expo-haptics';

export const triggerSuccessHaptic = (): void => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // Silencioso en emuladores
  }
};

export const triggerErrorHaptic = (): void => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch {}
};