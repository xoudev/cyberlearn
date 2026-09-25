import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ActionChip } from "@/components/buttons";
import { Text } from "@/components/ui";
import { uploadAvatarPhotoApi } from "@/lib/api";
import { AVATAR_PHOTO_HINT, photoUploadPart } from "@/lib/avatar-photo";

/**
 * "Envoyer une photo": the site's photo avatar, from the phone's library. The
 * picker crops to a square, as the site's cropper does, and the photo is
 * saved as soon as the server accepts it, as on the site. `onUploaded` gets the
 * new avatar already signed, or null when it could not be signed yet.
 */
export function PhotoUploadButton({
  onUploaded,
  disabled = false,
}: {
  onUploaded: (avatarSrc: string | null) => void;
  disabled?: boolean;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (): Promise<void> => {
    if (busy) return;
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      // Re-encoded as JPEG, which keeps a phone photo under the 2 Mo cap.
      quality: 0.7,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return;

    const checked = photoUploadPart(asset);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setBusy(true);
    const result = await uploadAvatarPhotoApi(checked.part);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? "Échec de l'envoi.");
      return;
    }
    onUploaded(result.avatarUrl);
  };

  return (
    <View style={{ gap: 6 }}>
      <View style={{ alignSelf: "flex-start" }}>
        <ActionChip
          label={busy ? "Envoi…" : "Envoyer une photo"}
          disabled={disabled || busy}
          onPress={() => void pick()}
        />
      </View>
      <Text variant="micro" style={{ color: colors.textMuted }}>
        {AVATAR_PHOTO_HINT}
      </Text>
      {error !== null ? (
        <Text
          variant="bodySm"
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={{ color: colors.danger }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
