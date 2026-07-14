import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { Logo } from "@/components/logo";
import { Screen } from "@/components/screen";
import { Text } from "@/components/ui";

export function AuthFormScreen({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Logo size={58} />
          <View style={styles.heading}>
            <Text variant="micro" style={styles.eyebrow}>
              {eyebrow}
            </Text>
            <Text variant="h1">{title}</Text>
            <Text variant="bodySm">{description}</Text>
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export function AuthField({
  label,
  secure = false,
  ...props
}: TextInputProps & { label: string; secure?: boolean }): React.JSX.Element {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isSecure = secure && !passwordVisible;

  return (
    <View style={styles.field}>
      <View style={styles.fieldHeader}>
        <Text variant="micro">{label}</Text>
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              passwordVisible ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
            hitSlop={8}
            onPress={() => setPasswordVisible((visible) => !visible)}
          >
            <Text variant="micro" style={styles.fieldAction}>
              {passwordVisible ? "Masquer" : "Afficher"}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        {...props}
        secureTextEntry={isSecure}
        placeholderTextColor={colors.textDisabled}
        selectionColor={colors.accent}
        style={styles.input}
      />
    </View>
  );
}

export function AuthTextLink({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.textLink, pressed && styles.textLinkPressed]}
    >
      <Text variant="bodySm" style={styles.textLinkLabel}>
        {label}
      </Text>
    </Pressable>
  );
}

export function AuthError({ message }: { message: string | null }): React.JSX.Element | null {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <Text variant="bodySm" style={styles.errorText}>
        {message}
      </Text>
    </View>
  );
}

export function AuthNotice({ message }: { message: string | null }): React.JSX.Element | null {
  if (!message) return null;
  return (
    <View style={styles.noticeBox}>
      <Text variant="bodySm" style={styles.noticeText}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 22,
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
  },
  heading: { gap: 7 },
  eyebrow: { color: colors.accent },
  field: { gap: 8 },
  fieldHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  fieldAction: { color: colors.accent, letterSpacing: 0.7 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgElevated,
    color: colors.textPrimary,
    fontFamily: `${fonts.mono}_400Regular`,
    fontSize: 14,
    paddingHorizontal: 14,
  },
  textLink: { minHeight: 38, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  textLinkPressed: { opacity: 0.7 },
  textLinkLabel: { color: colors.accent, textAlign: "center" },
  errorBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    backgroundColor: "rgba(255,77,109,0.08)",
    padding: 12,
  },
  errorText: { color: colors.danger },
  noticeBox: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: "rgba(10,255,212,0.07)",
    padding: 12,
  },
  noticeText: { color: colors.textSecondary },
});
