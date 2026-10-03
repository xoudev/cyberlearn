import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { type PhishingEmail, phishingPartLabel } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <PhishingEmail>, played in the app: tap each part of the message
 * that gives it away. A long press on the link shows where it really goes, as
 * a phone's mail app does. Same clues, same "show the clues" after three
 * harmless taps; nothing is sent anywhere.
 */

type PartStatus = "open" | "suspect" | "harmless";

const RED = colors.danger;

export function PhishingEmailExercise({ mail }: { mail: PhishingEmail }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [found, setFound] = useState<string[]>([]);
  const [harmless, setHarmless] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [lastHarmless, setLastHarmless] = useState<string | null>(null);
  const [linkShown, setLinkShown] = useState(false);

  const clueParts = mail.clues.map((c) => c.part);
  const done = revealed || clueParts.every((p) => found.includes(p));

  const report = (part: string): void => {
    if (done) return;
    if (clueParts.includes(part)) {
      if (!found.includes(part)) setFound([...found, part]);
      setLastHarmless(null);
    } else {
      if (!harmless.includes(part)) setHarmless([...harmless, part]);
      setLastHarmless(part);
    }
  };
  const statusOf = (part: string): PartStatus => {
    if (clueParts.includes(part) && (found.includes(part) || revealed)) return "suspect";
    if (harmless.includes(part)) return "harmless";
    return "open";
  };
  const shownClues = mail.clues.filter((c) => found.includes(c.part) || revealed);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.borderDefault,
        borderTopWidth: 2,
        borderTopColor: theme.accent,
        backgroundColor: colors.bgElevated,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            BOÎTE MAIL PIÉGÉE
          </Text>
          {mail.title !== undefined ? (
            <Text variant="body" style={{ fontFamily: `${fonts.sans}_700Bold` }}>
              {mail.title}
            </Text>
          ) : null}
        </View>
        <Text
          variant="mono"
          style={{ fontSize: 12, color: done ? theme.accent : colors.textMuted }}
        >
          {`${String(found.length)} / ${String(clueParts.length)}`}
        </Text>
      </View>

      <View style={{ padding: 12, gap: 10 }}>
        <Text variant="bodySm">
          Touche chaque élément qui te paraît suspect. Un appui long sur le lien montre où il mène.
        </Text>

        <View
          style={{
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            backgroundColor: theme.terminal.background,
          }}
        >
          <View style={{ borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
            <Part part="sender" status={statusOf("sender")} done={done} onReport={report}>
              <Text variant="bodySm" style={{ color: colors.textMuted }}>
                De :{" "}
                <Text variant="bodySm" style={{ color: colors.textPrimary }}>
                  {mail.fromName}
                </Text>{" "}
                {`<${mail.fromAddress}>`}
              </Text>
            </Part>
            <Part part="subject" status={statusOf("subject")} done={done} onReport={report}>
              <Text variant="bodySm" style={{ color: colors.textMuted }}>
                Objet :{" "}
                <Text variant="bodySm" style={{ color: colors.textPrimary }}>
                  {mail.subject}
                </Text>
              </Text>
            </Part>
          </View>

          {mail.body.map((paragraph, i) => {
            const part = `body-${String(i + 1)}`;
            return (
              <Part key={part} part={part} status={statusOf(part)} done={done} onReport={report}>
                <Text variant="bodySm" style={{ lineHeight: 20 }}>
                  {paragraph}
                </Text>
              </Part>
            );
          })}

          {mail.linkText !== undefined ? (
            <Part
              part="link"
              status={statusOf("link")}
              done={done}
              onReport={report}
              onLongPress={() => {
                setLinkShown(true);
              }}
            >
              <View style={{ alignSelf: "flex-start", backgroundColor: "#0024ff" }}>
                <Text
                  variant="bodySm"
                  style={{
                    color: "#ffffff",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    fontFamily: `${fonts.sans}_700Bold`,
                  }}
                >
                  {mail.linkText}
                </Text>
              </View>
            </Part>
          ) : null}
          {mail.attachment !== undefined ? (
            <Part part="attachment" status={statusOf("attachment")} done={done} onReport={report}>
              <Text variant="mono" style={{ fontSize: 12 }}>
                📎 {mail.attachment}
              </Text>
            </Part>
          ) : null}
          {linkShown && mail.linkUrl !== undefined ? (
            <Text
              variant="mono"
              style={{
                fontSize: 11,
                color: colors.textMuted,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderTopWidth: 1,
                borderTopColor: colors.borderSubtle,
              }}
            >
              {`Lien vers : ${mail.linkUrl}`}
            </Text>
          ) : null}
        </View>

        {lastHarmless !== null && !done ? (
          <Text variant="bodySm">{`${phishingPartLabel(lastHarmless)} : rien d'anormal ici.`}</Text>
        ) : null}

        {shownClues.map((clue) => (
          <Text key={clue.part} variant="bodySm" style={{ lineHeight: 20 }}>
            <Text variant="bodySm" style={{ color: RED, fontFamily: `${fonts.sans}_700Bold` }}>
              {`⚑ ${phishingPartLabel(clue.part)}`}
            </Text>
            {` : ${clue.why}`}
          </Text>
        ))}

        {done ? (
          <Text variant="bodySm" style={{ lineHeight: 20 }}>
            <Text
              variant="bodySm"
              style={{ color: theme.accent, fontFamily: `${fonts.sans}_700Bold` }}
            >
              {found.length < clueParts.length ? "Les indices. " : "Tout trouvé. "}
            </Text>
            {mail.conclusion ?? "Ne touche à rien : signale le message, puis supprime-le."}
          </Text>
        ) : null}

        {!done && harmless.length >= 3 ? (
          <SmallButton
            label="Montrer les indices"
            onPress={() => {
              setRevealed(true);
            }}
          />
        ) : null}
        {done ? (
          <SmallButton
            label="Recommencer"
            onPress={() => {
              setFound([]);
              setHarmless([]);
              setRevealed(false);
              setLastHarmless(null);
              setLinkShown(false);
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

/** A reportable part of the message: pressing it reports it. */
function Part({
  part,
  status,
  done,
  onReport,
  onLongPress,
  children,
}: {
  part: string;
  status: PartStatus;
  done: boolean;
  onReport: (part: string) => void;
  onLongPress?: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const suspect = status === "suspect";
  return (
    <Pressable
      onPress={() => {
        onReport(part);
      }}
      onLongPress={onLongPress}
      disabled={done && onLongPress === undefined}
      accessibilityRole="button"
      accessibilityHint={
        suspect
          ? "Signalé comme suspect"
          : status === "harmless"
            ? "Rien d'anormal"
            : `Signaler ${phishingPartLabel(part).toLowerCase()}`
      }
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: suspect ? RED : "transparent",
        backgroundColor: suspect ? `${RED}1A` : "transparent",
        opacity: status === "harmless" ? 0.55 : 1,
      }}
    >
      {children}
    </Pressable>
  );
}

function SmallButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: colors.borderDefault,
      }}
    >
      <Text variant="micro" style={{ color: colors.textSecondary }}>
        {label}
      </Text>
    </Pressable>
  );
}
