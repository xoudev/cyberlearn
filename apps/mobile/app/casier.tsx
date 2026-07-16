import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { CheckIcon, LockIcon } from "@/components/icons";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { equipCosmetic, unequipCosmetic, type CosmeticSlot } from "@/lib/api";
import {
  cosmeticCodeForType,
  loadoutWithCosmetic,
  resolveCosmeticTheme,
  useCosmetics,
  type CosmeticLoadout,
} from "@/lib/cosmetics";
import { RARITY_COLOR } from "@/lib/db";
import { useCasier, type CosmeticItem, type CosmeticType } from "@/lib/queries";
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

function CosmeticPreview({
  item,
  loadout,
}: {
  item: CosmeticItem;
  loadout: CosmeticLoadout;
}): React.JSX.Element {
  const previewTheme = resolveCosmeticTheme(loadoutWithCosmetic(loadout, item.type, item.code));
  const unavailableOpacity = item.owned ? 1 : 0.45;

  if (item.type === "TERMINAL_THEME") {
    return (
      <View
        style={{
          width: 72,
          height: 48,
          justifyContent: "center",
          gap: 4,
          paddingHorizontal: 8,
          backgroundColor: previewTheme.terminal.background,
          borderWidth: 1,
          borderColor: RARITY_COLOR[item.rarity],
          opacity: unavailableOpacity,
        }}
      >
        <Text variant="micro" style={{ color: previewTheme.terminal.foreground, fontSize: 7 }}>
          $ whoami
        </Text>
        <View
          style={{ width: "68%", height: 2, backgroundColor: previewTheme.terminal.foreground }}
        />
      </View>
    );
  }

  if (item.type === "HEXAGON_STYLE") {
    return (
      <View style={{ width: 72, height: 52, alignItems: "center", opacity: unavailableOpacity }}>
        <Svg width={52} height={52} viewBox="0 0 100 100">
          {previewTheme.hex.glowOpacity > 0 ? (
            <Polygon
              points="50,4 91,27 91,73 50,96 9,73 9,27"
              fill="none"
              stroke={previewTheme.accent}
              strokeWidth={8}
              opacity={previewTheme.hex.glowOpacity}
            />
          ) : null}
          <Polygon
            points="50,4 91,27 91,73 50,96 9,73 9,27"
            fill={previewTheme.accent}
            fillOpacity={previewTheme.hex.fillOpacity}
            stroke={previewTheme.accent}
            strokeWidth={previewTheme.hex.strokeWidth}
            strokeDasharray={previewTheme.hex.dash}
          />
        </Svg>
      </View>
    );
  }

  if (item.type === "PROFILE_FRAME") {
    return (
      <View
        style={{
          width: 58,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: Math.max(1, previewTheme.frame.strokeWidth),
          borderColor: previewTheme.frame.color,
          backgroundColor: `${previewTheme.frame.color}12`,
          opacity: unavailableOpacity,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            backgroundColor: colors.bgBase,
            borderWidth: 1,
            borderColor: colors.borderDefault,
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        width: 72,
        height: 48,
        justifyContent: "center",
        opacity: unavailableOpacity,
      }}
    >
      <View style={{ height: 7, backgroundColor: previewTheme.accent }} />
      <View
        style={{
          width: "58%",
          height: 3,
          marginTop: 7,
          backgroundColor: `${previewTheme.accent}66`,
        }}
      />
    </View>
  );
}

export default function Casier(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useCasier(userId);
  const { loadout, theme, setCosmetic } = useCosmetics();
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleEquip(item: CosmeticItem): Promise<void> {
    if (!item.owned || busyCode) return;
    const previousCode = cosmeticCodeForType(loadout, item.type);
    const nextCode = previousCode === item.code ? null : item.code;
    setActionError(null);
    setBusyCode(item.code);
    const res =
      nextCode === null
        ? // SAFETY: CosmeticType and CosmeticSlot contain the same four server-validated values.
          await unequipCosmetic(item.type as CosmeticSlot)
        : await equipCosmetic(item.code);
    if (!res.ok) {
      setBusyCode(null);
      setActionError(res.error ?? "Opération impossible.");
      return;
    }
    setBusyCode(null);
    setCosmetic(item.type, nextCode);
    await queryClient.invalidateQueries({ queryKey: ["casier", userId] });
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
                  style={{ color: theme.accent, letterSpacing: 1.5, marginBottom: 10 }}
                >
                  {TYPE_LABEL[type]}
                </Text>
                <View style={{ gap: 10 }}>
                  {group.map((item) => {
                    const equipped = cosmeticCodeForType(loadout, item.type) === item.code;
                    return (
                      <PressableScale
                        key={item.code}
                        disabled={!item.owned || busyCode !== null}
                        onPress={() => void toggleEquip(item)}
                      >
                        <Card
                          accent={equipped ? theme.accent : undefined}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12,
                            opacity: item.owned ? 1 : 0.55,
                          }}
                        >
                          <View style={{ position: "relative" }}>
                            <CosmeticPreview item={item} loadout={loadout} />
                            {!item.owned ? (
                              <View
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <LockIcon color={colors.textDisabled} size={14} strokeWidth={1.4} />
                              </View>
                            ) : equipped ? (
                              <View
                                style={{
                                  position: "absolute",
                                  right: -3,
                                  bottom: -3,
                                  width: 20,
                                  height: 20,
                                  alignItems: "center",
                                  justifyContent: "center",
                                  backgroundColor: colors.bgBase,
                                  borderWidth: 1,
                                  borderColor: theme.accent,
                                }}
                              >
                                <CheckIcon color={theme.accent} size={12} strokeWidth={2} />
                              </View>
                            ) : null}
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
                          ) : equipped ? (
                            <Pill label="Équipé" color={theme.accent} active />
                          ) : item.owned ? (
                            <Pill label="Équiper" color={theme.accent} />
                          ) : (
                            <Pill label="Verrouillé" color={colors.textDisabled} />
                          )}
                        </Card>
                      </PressableScale>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
