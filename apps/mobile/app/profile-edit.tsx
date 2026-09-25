import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { AuthField } from "@/components/auth-form";
import { BackButton, GradientButton } from "@/components/buttons";
import { MessageInput } from "@/components/forum";
import { Avatar } from "@/components/media";
import { PhotoUploadButton } from "@/components/photo-upload";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { SectionLabel, Text } from "@/components/ui";
import { fetchMyAvatarUrl, updateProfileApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  PROFILE_AVATARS,
  PROFILE_BIO_MAX,
  PROFILE_NAME_MAX,
  initialAvatarChoice,
  profileEditBody,
} from "@/lib/profile-edit";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

interface OwnProfile {
  username: string | null;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
}

/**
 * The site's /settings/profile: the name shown, the bio, and one of the
 * built-in avatars or a photo from the phone. A photo is saved as soon as it
 * is sent, as on the site; it, or a glyph, stays as it is unless another
 * avatar is picked. The handle is not editable, as on the site.
 */
export default function ProfileEdit(): React.JSX.Element {
  const { session } = useSession();
  const userId = session?.user.id;
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["profile-edit", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<OwnProfile | null> => {
      const { data: row } = await supabase
        .from("users")
        .select("username,displayName,bio,avatarUrl")
        .eq("id", userId as string) // gated by `enabled`
        .maybeSingle();
      return row as OwnProfile | null;
    },
  });

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Réglages" />
      </View>
      <SectionLabel eyebrow="Profil" title="Modifier mon profil" />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="PROFILE_EDIT" />
      ) : (
        <ProfileForm profile={data} userId={userId} />
      )}
    </Screen>
  );
}

function ProfileForm({
  profile,
  userId,
}: {
  profile: OwnProfile;
  userId: string | undefined;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useCosmetics();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatar, setAvatar] = useState(initialAvatarChoice(profile.avatarUrl));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [photoSaved, setPhotoSaved] = useState(false);

  // The avatar in use, drawable: an uploaded photo needs the server to sign it.
  const [currentSrc, setCurrentSrc] = useState<string | null>(profile.avatarUrl);
  useEffect(() => {
    if (!profile.avatarUrl?.startsWith("__upload:")) return;
    let live = true;
    void fetchMyAvatarUrl()
      .then((url) => {
        if (live) setCurrentSrc(url);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [profile.avatarUrl]);

  const save = async (): Promise<void> => {
    setSending(true);
    setError(null);
    setSaved(false);
    const result = await updateProfileApi(profileEditBody({ displayName, bio, avatar }));
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "Enregistrement impossible.");
      return;
    }
    setSaved(true);
    await queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    await queryClient.invalidateQueries({ queryKey: ["profile-edit", userId] });
    router.back();
  };

  const choices: { id: string; src: string | null; label: string }[] = [
    ...(avatar === "current" || initialAvatarChoice(profile.avatarUrl) === "current"
      ? [{ id: "current", src: currentSrc, label: "Actuel" }]
      : []),
    ...PROFILE_AVATARS.map((path, i) => ({ id: path, src: path, label: String(i + 1) })),
  ];

  return (
    <View style={{ gap: 14 }}>
      {profile.username ? (
        <Text variant="micro" style={{ color: colors.textMuted }}>
          {`Identifiant · @${profile.username} (non modifiable)`}
        </Text>
      ) : null}

      <AuthField
        label="Nom affiché"
        value={displayName}
        onChangeText={(t) => {
          setDisplayName(t);
          setError(null);
        }}
        maxLength={PROFILE_NAME_MAX}
        accessibilityLabel="Nom affiché"
      />

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="micro">Bio</Text>
          <Text
            variant="micro"
            style={{
              color: bio.length > PROFILE_BIO_MAX * 0.85 ? colors.warning : colors.textMuted,
            }}
          >
            {`${String(bio.length)} / ${String(PROFILE_BIO_MAX)}`}
          </Text>
        </View>
        <MessageInput
          value={bio}
          onChangeText={(t) => {
            setBio(t);
            setError(null);
          }}
          minHeight={90}
          maxLength={PROFILE_BIO_MAX}
          placeholder="Qui es-tu ? Qu'est-ce qui t'a amené ici ?"
          accessibilityLabel="Bio"
        />
      </View>

      <Text variant="micro">Avatar</Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
      >
        {choices.map((choice) => {
          const selected = avatar === choice.id;
          return (
            <Pressable
              key={choice.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={
                choice.id === "current" ? "Garder l'avatar actuel" : `Avatar ${choice.label}`
              }
              onPress={() => {
                setAvatar(choice.id);
                setPhotoSaved(false);
              }}
              style={{
                width: "22%",
                flexGrow: 1,
                alignItems: "center",
                gap: 6,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: selected ? theme.accent : colors.borderSubtle,
                backgroundColor: selected ? `${theme.accent}12` : "transparent",
              }}
            >
              <Avatar avatarUrl={choice.src} displayName={displayName || "?"} size={52} />
              <Text variant="micro" style={{ color: selected ? theme.accent : colors.textMuted }}>
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <PhotoUploadButton
        disabled={sending}
        onUploaded={(src) => {
          setCurrentSrc(src);
          setAvatar("current");
          setPhotoSaved(true);
          void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
          void queryClient.invalidateQueries({ queryKey: ["profile-edit", userId] });
        }}
      />
      {photoSaved ? (
        <Text variant="bodySm" accessibilityLiveRegion="polite" style={{ color: theme.accent }}>
          Photo enregistrée.
        </Text>
      ) : null}

      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text variant="bodySm" accessibilityLiveRegion="polite" style={{ color: theme.accent }}>
          Profil enregistré.
        </Text>
      ) : null}

      <GradientButton
        label="Enregistrer"
        loading={sending}
        disabled={displayName.trim() === ""}
        onPress={() => void save()}
      />
    </View>
  );
}
