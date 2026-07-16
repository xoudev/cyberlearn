import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { CheckIcon, LockIcon } from "@/components/icons";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { equipCosmetic, unequipCosmetic, type CosmeticSlot } from "@/lib/api";
import { RARITY_COLOR } from "@/lib/db";
import { useLocker, type CosmeticItem, type CosmeticType } from "@/lib/queries";
import { useSession } from "@/lib/session";

const TYPE_LABEL: Record<CosmeticType, string> = {
  ACCENT_COLOR: "Couleurs d'accent",
  HEXAGON_STYLE: "Styles d'hexagone",
  PROFILE_FRAME: "Cadres de profil",
  TERMINAL_THEME: "Thèmes de terminal",
};

const TYPE_ORDER: CosmeticType[] = [
  "ACCENT_COLOR",
  "HEXAGON_STYLE",
  "PROFILE_FRAME",
  "TERMINAL_THEME",
];

export default function Locker(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useLocker(userId);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleEquip(item: CosmeticItem): Promise<void> {
    if (!item.owned || busyCode) return;
    setActionError(null);
    setBusyCode(item.code);
    const res = item.equipped
      ? await unequipCosmetic(item.type as CosmeticSlot)
      : await equipCosmetic(item.code);
    setBusyCode(null);
    if (!res.ok) {
      setActionError(res.error ?? "Opération impossible.");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["locker", userId] });
  }

  const items = data?.items ?? [];
  const ownedCount = items.filter((i) => i.owned).length;

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>

      <SectionLabel
        eyebrow="Cosmétiques"
        title="Casier"
        right={
          items.length > 0 ? (
            <Text variant="micro">
              {ownedCount}/{items.length} débloqués
            </Text>
          ) : undefined
        }
      />

      {actionError ? (
        <Text variant="bodySm" style={{ color: colors.danger, marginBottom: 10 }}>
          {actionError}
        </Text>
      ) : null}

      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} code="CASIER_LOAD" />
      ) : items.length === 0 ? (
        <EmptyState
          title="Casier vide"
          body="Les cosmétiques arrivent avec les saisons et les défis."
        />
      ) : (
        <View style={{ gap: 24 }}>
          {TYPE_ORDER.map((type) => {
            const group = items.filter((i) => i.type === type);
            if (group.length === 0) return null;
            return (
              <View key={type}>
                <Text
                  variant="micro"
                  style={{ color: colors.accent, letterSpacing: 1.5, marginBottom: 10 }}
                >
                  {TYPE_LABEL[type]}
                </Text>
                <View style={{ gap: 10 }}>
                  {group.map((item) => (
                    <PressableScale
                      key={item.code}
                      disabled={!item.owned || busyCode !== null}
                      onPress={() => void toggleEquip(item)}
                    >
                      <Card
                        accent={item.equipped ? colors.accent : undefined}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          opacity: item.owned ? 1 : 0.55,
                        }}
                      >
                        <View
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            borderWidth: 1.5,
                            borderColor: RARITY_COLOR[item.rarity],
                            backgroundColor: `${RARITY_COLOR[item.rarity]}18`,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {item.owned ? (
                            item.equipped ? (
                              <CheckIcon color={colors.accent} size={15} strokeWidth={2} />
                            ) : null
                          ) : (
                            <LockIcon color={colors.textDisabled} size={13} strokeWidth={1.4} />
                          )}
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="h3">{item.label}</Text>
                          {item.description ? (
                            <Text variant="bodySm" numberOfLines={2}>
                              {item.description}
                            </Text>
                          ) : null}
                          <Text variant="micro" style={{ color: RARITY_COLOR[item.rarity] }}>
                            {item.rarity}
                          </Text>
                        </View>
                        {busyCode === item.code ? (
                          <Text variant="micro" style={{ color: colors.textMuted }}>
                            …
                          </Text>
                        ) : item.equipped ? (
                          <Pill label="Équipé" color={colors.accent} active />
                        ) : item.owned ? (
                          <Pill label="Équiper" color={colors.accent} />
                        ) : (
                          <Pill label="Verrouillé" color={colors.textDisabled} />
                        )}
                      </Card>
                    </PressableScale>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
