import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onClose?: () => void;
}

export function CustomAlert({ visible, title, message, buttons, onClose }: CustomAlertProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Default button if none provided
  const alertButtons = buttons && buttons.length > 0 ? buttons : [
    { text: 'OK', style: 'default', onPress: onClose }
  ];

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.alertContainer, { borderColor: Colors[theme].icon }]}>
          <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
          {message && <ThemedText style={styles.message}>{message}</ThemedText>}
          
          <View style={styles.buttonContainer}>
            {alertButtons.map((btn, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.button,
                  btn.style === 'cancel' && styles.cancelButton,
                  // Add separator border if not the last button and horizontal layout
                  // For simplicity, we'll just use margin
                ]}
                onPress={() => {
                  if (btn.onPress) btn.onPress();
                  // We don't automatically close here because the parent might want to control visibility
                  // But usually alerts close on press. 
                  // The parent component should handle setting visible to false in the onPress callback.
                }}
              >
                <ThemedText 
                  style={[
                    styles.buttonText,
                    { color: btn.style === 'destructive' ? '#ff3b30' : Colors[theme].tint },
                    btn.style === 'cancel' && { fontWeight: 'normal', opacity: 0.7 }
                  ]}
                >
                  {btn.text}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    width: Dimensions.get('window').width * 0.8,
    maxWidth: 340,
    borderRadius: 14,
    paddingTop: 20,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  message: {
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
    opacity: 0.8,
  },
  buttonContainer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(128,128,128,0.2)',
  },
  cancelButton: {
    // specific styles for cancel button if needed
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
