import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Pressable, Share, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { certificateVerifyUrl } from "@cyberlearn/lib/social/portfolio";
import { colors, fonts } from "@cyberlearn/tokens";
import { PopIn, PressableScale, Rise } from "@/components/anim";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Card, Divider, Text } from "@/components/ui";
import { SITE_URL } from "@/lib/api";
import { revocationLine, verifyPageLabel } from "@/lib/certificates";
import { useCertificateStanding } from "@/lib/queries";
import { useSession } from "@/lib/session";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function CertificateDetail(): React.JSX.Element {
  const router = useRouter();
  const { session } = useSession();
  const { publicId, title, score, date } = useLocalSearchParams<{
    publicId: string;
    title?: string;
    score?: string;
    date?: string;
  }>();
  // Read here rather than handed over: a path's final card opens this screen
  // with the id alone. Until it answers, the certificate shows as it was issued.
  const { data: standing } = useCertificateStanding(session?.user.id, publicId);
  const revocation = standing ? revocationLine(standing, fmtDate) : null;
  const revoked = revocation !== null;
  const frame = revoked ? colors.danger : colors.accent;
  // The site the app is pointed at (SITE_URL), not the production address
  // written in: a build aimed at a local or staging site sent "Vérifier" and
  // "Partager" to a production page where the certificate does not exist.
  const verifyUrl = certificateVerifyUrl(SITE_URL, publicId ?? "");

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
            borderColor: frame,
            padding: 3,
          }}
        >
          <Card
            style={{
              alignItems: "center",
              gap: 12,
              paddingVertical: 30,
              opacity: revoked ? 0.85 : 1,
            }}
          >
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
            <Text variant="micro" style={{ color: frame, letterSpacing: 2 }}>
              {revoked ? "Certificat révoqué" : "Certificat de réussite"}
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
            {revocation !== null ? (
              <Text
                variant="mono"
                style={{ color: colors.danger, textAlign: "center", maxWidth: 280 }}
              >
                {revocation}
              </Text>
            ) : null}
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
              Vérifiable par n&apos;importe qui sur {verifyPageLabel(SITE_URL)}
            </Text>
          </Card>
        </View>
      </Rise>

      <Rise index={1} style={{ marginTop: 16 }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Nothing to share once revoked, as on the site; the page still
              says what happened, for whoever already has the link. */}
          {revoked ? null : (
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
              }}
            >
              <Text variant="micro">Partager</Text>
            </PressableScale>
          )}
          <PressableScale
            onPress={() => void WebBrowser.openBrowserAsync(verifyUrl)}
            style={{
              flex: 1,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.accent,
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
