import React from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "@cyberlearn/tokens";
import { useReducedMotionPreference } from "@/lib/accessibility";

export function AppModal({
  visible,
  onClose,
  closeDisabled = false,
  scroll = false,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
  scroll?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotionPreference();

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "fade"}
      hardwareAccelerated
      statusBarTranslucent
      onRequestClose={() => {
        if (!closeDisabled) onClose();
      }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          accessible={false}
          onPress={closeDisabled ? undefined : onClose}
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 20,
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            backgroundColor: "rgba(2,1,14,0.78)",
          }}
        >
          <Pressable
            accessible={false}
            onPress={(event) => event.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "92%",
              alignSelf: "center",
              borderRadius: radius.sm,
              backgroundColor: colors.bgElevated,
              padding: 20,
              gap: 12,
              shadowColor: colors.bgBase,
              shadowOpacity: 0.32,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 12 },
              elevation: 18,
            }}
          >
            {scroll ? (
              <ScrollView
                accessibilityViewIsModal
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
              >
                {children}
              </ScrollView>
            ) : (
              <View accessibilityViewIsModal style={{ gap: 12 }}>
                {children}
              </View>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
