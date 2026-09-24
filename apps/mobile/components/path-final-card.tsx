import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { GradientButton } from "@/components/buttons";
import { CheckIcon, LockIcon } from "@/components/icons";
import { Card, Text } from "@/components/ui";
import { claimCertificateApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { finalStepOf, waitLabel } from "@/lib/exam";
import { useExamStatus } from "@/lib/queries";

/**
 * The end of a path, under its missions: the site's final "boss" node. One
 * card, one action, from where the learner stands: locked until the lessons
 * are done, then the exam (or the claim, on a path without one), then the
 * certificate. A class path carries no certificate, so it shows nothing.
 */
export function PathFinalCard({
  userId,
  slug,
  missionCount,
}: {
  userId: string | undefined;
  slug: string;
  missionCount: number;
}): React.JSX.Element | null {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useCosmetics();
  const { data, refetch } = useExamStatus(userId, slug);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A missing status only hides the card: the path itself is still usable.
  if (!data?.path.certifiable) return null;
  const { path, status } = data;
  const step = finalStepOf(status);
  const openExam = (): void => {
    router.push({ pathname: "/exam/[slug]", params: { slug } });
  };

  const claim = async (): Promise<void> => {
    setClaiming(true);
    setError(null);
    const result = await claimCertificateApi(slug);
    setClaiming(false);
    if (!result.ok) {
      setError(result.error ?? "Le certificat n'a pas pu être émis. Réessaie.");
      return;
    }
    await refetch();
    void queryClient.invalidateQueries();
  };

  let eyebrow: string;
  let sub: string;
  let action: React.ReactNode = null;
  switch (step.kind) {
    case "certified":
      eyebrow = "// Récompense · débloquée";
      sub = "Tu as validé ce parcours. Ton certificat vérifiable est disponible.";
      if (step.publicId !== null) {
        const publicId = step.publicId;
        action = (
          <GradientButton
            label="Voir mon certificat"
            onPress={() => {
              router.push({
                pathname: "/certificates/[publicId]",
                params: { publicId, title: path.title },
              });
            }}
          />
        );
      }
      break;
    case "ready":
      eyebrow = "// Examen final · débloqué";
      sub =
        "Passe l'examen final chronométré pour valider le parcours et débloquer ton certificat.";
      action = <GradientButton label="Passer l'examen final" onPress={openExam} />;
      break;
    case "resume":
      eyebrow = "// Examen final · en cours";
      sub =
        "Une tentative est en cours et le chrono tourne : reprends-la avant qu'il n'arrive à 00:00.";
      action = <GradientButton label="Reprendre l'examen" onPress={openExam} />;
      break;
    case "cooldown":
      eyebrow = "// Examen final · en attente";
      sub = `Examen déjà passé récemment. Prochaine tentative possible ${waitLabel(step.until, Date.now())}.`;
      break;
    case "claim":
      eyebrow = "// Récompense · à réclamer";
      sub = "Tu as complété toutes les leçons de ce parcours. Récupère ton certificat vérifiable.";
      action = (
        <GradientButton
          label={claiming ? "Émission…" : "Obtenir mon certificat"}
          disabled={claiming}
          onPress={() => void claim()}
        />
      );
      break;
    case "locked":
      eyebrow = "// Récompense finale · certificat";
      sub = `Termine les ${String(missionCount)} missions pour débloquer un certificat vérifiable, signé SHA-256 et partageable.`;
      break;
  }

  const unlocked = step.kind !== "locked";
  return (
    <Card accent={unlocked ? theme.accent : undefined} style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 32,
            height: 32,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1.5,
            borderColor: unlocked ? theme.accent : colors.textDisabled,
          }}
        >
          {unlocked ? (
            <CheckIcon color={theme.accent} size={14} strokeWidth={2} />
          ) : (
            <LockIcon color={colors.textDisabled} size={14} strokeWidth={1.4} />
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" style={{ color: unlocked ? theme.accent : colors.textMuted }}>
            {eyebrow}
          </Text>
          <Text variant="h3" numberOfLines={2}>
            Certificat {path.title}
          </Text>
        </View>
      </View>
      <Text variant="bodySm">{sub}</Text>
      {action}
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
    </Card>
  );
}
