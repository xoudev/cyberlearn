import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ActionChip } from "@/components/buttons";
import { Text } from "@/components/ui";
import { uploadAvatarPhotoApi } from "@/lib/api";
import {
  AVATAR_PHOTO_HINT,
  AVATAR_PHOTO_QUALITY,
  avatarPhotoTransform,
  photoUploadPart,
  type PickedPhoto,
} from "@/lib/avatar-photo";

/**
 * The picked photo as the site's cropper exports it: a centred square, reduced
 * to 512 px, JPEG. If the phone cannot do it, the photo goes as picked and the
 * server's checks decide.
 */
async function reducedPhoto(asset: ImagePicker.ImagePickerAsset): Promise<PickedPhoto> {
  try {
    const { crop, size } = avatarPhotoTransform(asset.width, asset.height);
    let context = ImageManipulator.manipulate(asset.uri);
    if (crop !== null) context = context.crop(crop);
    context = context.resize({ width: size, height: size });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: AVATAR_PHOTO_QUALITY,
    });
    return { uri: saved.uri, mimeType: "image/jpeg" };
  } catch {
    return asset;
  }
}

/**
 * "Envoyer une photo": the site's photo avatar, from the phone's library. The
 * picker crops to a square and the photo is reduced to 512 px, as the site's
 * cropper does, then saved as soon as the server accepts it, as on the site. `onUploaded` gets the
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
      // Full quality here: the photo is reduced and compressed once, below.
      quality: 1,
    });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return;

    setBusy(true);
    const checked = photoUploadPart(await reducedPhoto(asset));
    if (!checked.ok) {
      setBusy(false);
      setError(checked.error);
      return;
    }
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
