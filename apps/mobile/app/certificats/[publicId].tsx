import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Pressable, Share, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { colors, fonts } from "@cyberlearn/tokens";
import { PopIn, PressableScale, Rise } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Card, Divider, Text } from "@/components/ui";

const VERIFY_BASE = "https://www.cyberlearn.fr/verify";

export default function CertificateDetail(): React.JSX.Element {
  const router = useRouter();
  const { publicId, title, score, date } = useLocalSearchParams<{
    publicId: string;
    title?: string;
    score?: string;
    date?: string;
  }>();
  const verifyUrl = `${VERIFY_BASE}/${publicId ?? ""}`;

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>

      <Rise index={0}>
        {/* Certificate frame */}
        <View
          style={{
            borderWidth: 1,
            borderColor: colors.accent,
            padding: 3,
          }}
        >
          <Card style={{ alignItems: "center", gap: 12, paddingVertical: 30 }}>
            <PopIn>
              <View
                style={{ width: 74, height: 80, alignItems: "center", justifyContent: "center" }}
              >
                <Svg width={74} height={80} viewBox="0 0 100 108" style={{ position: "absolute" }}>
                  <Polygon
                    points="50,2 96,28 96,80 50,106 4,80 4,28"
                    fill="none"
                    stroke={colors.accent}
                    strokeWidth={2.5}
                  />
                  <Polygon
                    points="50,14 86,34 86,74 50,94 14,74 14,34"
                    fill="rgba(10,255,212,0.08)"
                  />
                </Svg>
                <Text
                  style={{
                    fontFamily: `${fonts.sans}_800ExtraBold`,
                    fontSize: 22,
                    color: colors.accent,
                  }}
                >
                  CL
                </Text>
              </View>
            </PopIn>
            <Text variant="micro" style={{ color: colors.accent, letterSpacing: 2 }}>
              Certificat de réussite
            </Text>
            <Text variant="h1" style={{ textAlign: "center" }}>
              {title ?? "Parcours certifié"}
            </Text>
            <View style={{ flexDirection: "row", gap: 18 }}>
              {score ? (
                <Text variant="mono" style={{ color: colors.textSecondary }}>
                  Score {score} %
                </Text>
              ) : null}
              {date ? (
                <Text variant="mono" style={{ color: colors.textMuted }}>
                  {date}
                </Text>
              ) : null}
            </View>
            <Divider style={{ alignSelf: "stretch", marginVertical: 8 }} />
            <Text variant="micro">Code de vérification</Text>
            <Text
              selectable
              style={{
                fontFamily: `${fonts.mono}_700Bold`,
                fontSize: 13,
                color: colors.accent,
                textAlign: "center",
              }}
            >
              {publicId}
            </Text>
            <Text
              variant="micro"
              style={{ color: colors.textDisabled, textAlign: "center", maxWidth: 240 }}
            >
              Vérifiable par n&apos;importe qui sur cyberlearn.fr/verify
            </Text>
          </Card>
        </View>
      </Rise>

      <Rise index={1} style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PressableScale
            onPress={() => {
              void Share.share({ message: `Mon certificat CyberLearn : ${verifyUrl}` });
            }}
            style={{
              flex: 1,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.borderDefault,
              borderRadius: 10,
            }}
          >
            <Text variant="micro">Partager</Text>
          </PressableScale>
          <PressableScale
            onPress={() => void WebBrowser.openBrowserAsync(verifyUrl)}
            style={{
              flex: 1,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent,
              borderRadius: 10,
            }}
          >
            <Text variant="micro" style={{ color: colors.bgBase }}>
              Vérifier en ligne ↗
            </Text>
          </PressableScale>
        </View>
      </Rise>
    </Screen>
  );
}
