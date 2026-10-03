import React from "react";
import { View } from "react-native";
import { GLOSSARY, type GlossaryCategory } from "@cyberlearn/lib/glossary/terms";
import { colors, fonts } from "@cyberlearn/tokens";
import { BackButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Card, Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/** The order the categories are read in: from the wire up to the law, as on the site. */
const CATEGORIES: readonly GlossaryCategory[] = [
  "Matériel",
  "Système",
  "Réseau",
  "Sécurité",
  "Cryptographie",
  "Développement",
  "Données et droit",
];

const COLLATOR = new Intl.Collator("fr", { sensitivity: "base" });

/**
 * The site's /glossaire: every word the lessons underline, with its
 * definition, from the same list (@cyberlearn/lib/glossary/terms).
 */
export default function Glossary(): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <View style={{ gap: 8, marginBottom: 20 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {"// GLOSSAIRE"}
        </Text>
        <Text variant="display" style={{ fontSize: 28 }}>
          Les mots du métier
        </Text>
        <Text variant="body">
          {`Les ${String(GLOSSARY.length)} termes techniques que les leçons soulignent. Dans une leçon, touche un mot souligné en pointillés pour lire sa définition.`}
        </Text>
      </View>

      <View style={{ gap: 14 }}>
        {CATEGORIES.map((category) => {
          const terms = GLOSSARY.filter((t) => t.category === category).sort((a, b) =>
            COLLATOR.compare(a.term, b.term),
          );
          return (
            <Card key={category} style={{ gap: 12 }}>
              <Text variant="micro" style={{ color: colors.textMuted }}>
                {category}
              </Text>
              {terms.map((term) => (
                <View key={term.slug} style={{ gap: 2 }}>
                  <Text
                    variant="body"
                    style={{ fontFamily: `${fonts.sans}_700Bold`, color: colors.textPrimary }}
                  >
                    {term.term}
                  </Text>
                  <Text variant="bodySm" style={{ color: colors.textSecondary, lineHeight: 20 }}>
                    {term.definition}
                  </Text>
                </View>
              ))}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
