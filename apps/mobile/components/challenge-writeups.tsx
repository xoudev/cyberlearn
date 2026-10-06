import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip, GradientButton } from "@/components/buttons";
import { NoteMarkdown } from "@/components/note-markdown";
import { Card, Text } from "@/components/ui";
import { deleteWriteupApi, fetchWriteupsApi, publishWriteupApi } from "@/lib/api";
import { solutionsLabel, type OwnWriteup, type WriteupView } from "@/lib/challenges";

/**
 * The site's write-ups section, in the app: the count only until the
 * challenge is solved (a solution is the answer), then the reader's own
 * solution to write, replace or remove, and the others' to read, in the same
 * Markdown as the forum.
 */
export function ChallengeWriteups({ challengeId }: { challengeId: string }): React.JSX.Element {
  const { data, isLoading, error } = useQuery({
    queryKey: ["writeups", challengeId],
    queryFn: () => fetchWriteupsApi(challengeId),
  });

  return (
    <View style={{ gap: 10 }}>
      <Text variant="h2">Solutions</Text>
      {isLoading ? (
        <Text variant="bodySm">Chargement…</Text>
      ) : error !== null || data === undefined ? (
        <Text variant="bodySm" style={{ color: colors.textMuted }}>
          Les solutions ne se chargent pas pour l&apos;instant.
        </Text>
      ) : (
        <>
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            {solutionsLabel(data.count)}
          </Text>
          {!data.solved ? (
            <Card style={{ gap: 4 }}>
              <Text variant="bodySm">
                Les solutions des autres s&apos;ouvrent quand tu as résolu le défi : une solution,
                c&apos;est la réponse. Une fois le flag trouvé, tu pourras aussi publier la tienne.
              </Text>
            </Card>
          ) : (
            <>
              <OwnEditor challengeId={challengeId} own={data.own} />
              {data.others.length === 0 ? (
                <Text variant="bodySm" style={{ color: colors.textMuted }}>
                  Personne d&apos;autre n&apos;a encore publié sa solution.
                </Text>
              ) : (
                data.others.map((writeup) => <OtherWriteup key={writeup.id} writeup={writeup} />)
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

function OtherWriteup({ writeup }: { writeup: WriteupView }): React.JSX.Element {
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text variant="micro" style={{ color: colors.textSecondary }}>
          {writeup.author?.name ?? "Compte supprimé"}
        </Text>
        <Text variant="micro">
          {new Date(writeup.updatedAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </Text>
      </View>
      <NoteMarkdown markdown={writeup.content} />
    </Card>
  );
}

function OwnEditor({
  challengeId,
  own,
}: {
  challengeId: string;
  own: OwnWriteup | null;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(own?.content ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "held" | "error"; text: string } | null>(
    null,
  );
  useEffect(() => {
    setContent(own?.content ?? "");
  }, [own?.content]);

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["writeups", challengeId] });
  };

  const publish = async (): Promise<void> => {
    setBusy(true);
    const reply = await publishWriteupApi(challengeId, content);
    setBusy(false);
    if (!reply.ok) {
      setMessage({ tone: "error", text: reply.error });
      return;
    }
    setMessage(
      reply.heldForReview === true
        ? {
            tone: "held",
            text: "Enregistrée, et en attente d'une relecture : personne d'autre ne la voit encore.",
          }
        : { tone: "ok", text: "Solution publiée : les autres qui ont résolu le défi la voient." },
    );
    refresh();
  };

  const remove = (): void => {
    Alert.alert("Retirer ta solution ?", "Les autres ne la verront plus.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Retirer",
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            const reply = await deleteWriteupApi(challengeId);
            setBusy(false);
            setMessage(
              reply.ok
                ? { tone: "ok", text: "Solution retirée." }
                : { tone: "error", text: reply.error },
            );
            if (reply.ok) {
              setContent("");
              refresh();
            }
          })();
        },
      },
    ]);
  };

  const color =
    message?.tone === "error"
      ? colors.danger
      : message?.tone === "held"
        ? colors.warning
        : colors.success;

  return (
    <Card style={{ gap: 8 }}>
      <Text variant="micro" style={{ color: colors.textMuted }}>
        {own !== null ? "TA SOLUTION (PUBLIÉE)" : "TA SOLUTION"}
      </Text>
      {own?.isHidden === true && message === null ? (
        <Text variant="bodySm" style={{ color: colors.warning }}>
          Ta solution attend une relecture : personne d&apos;autre ne la voit encore.
        </Text>
      ) : null}
      <TextInput
        value={content}
        onChangeText={(text) => {
          setContent(text);
          setMessage(null);
        }}
        multiline
        maxLength={10000}
        placeholder="Explique ta démarche : par où tu as commencé, ce qui a coincé, la commande ou le code qui a marché."
        placeholderTextColor={colors.textDisabled}
        accessibilityLabel="Ta solution"
        editable={!busy}
        style={{
          minHeight: 140,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.bgBase,
          color: colors.textPrimary,
          fontFamily: `${fonts.mono}_400Regular`,
          fontSize: 13,
          textAlignVertical: "top",
        }}
      />
      {message !== null ? (
        <Text variant="bodySm" style={{ color }}>
          {message.text}
        </Text>
      ) : null}
      <GradientButton
        label={own !== null ? "Mettre à jour" : "Publier ma solution"}
        loading={busy}
        disabled={content.trim() === ""}
        onPress={() => void publish()}
      />
      {own !== null ? (
        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip label="Retirer" tone="neutral" disabled={busy} onPress={remove} />
        </View>
      ) : null}
    </Card>
  );
}
