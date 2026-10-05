import React from "react";
import { View } from "react-native";
import type { ModuleRoute } from "@cyberlearn/lib/dashboard/module-route";
import { colors } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The module in progress as a row of lessons: done, the one offered now, the
 * ones to come. The same nodes the site's dashboard draws beside its mission
 * card (`@cyberlearn/lib/dashboard/module-route`), at phone size.
 */
export function ModuleRouteRow({ route }: { route: ModuleRoute }): React.JSX.Element {
  const { theme } = useCosmetics();
  const count = route.nodes.length;
  const nowIndex = route.nodes.findIndex((node) => node.state === "now");
  // The lit part of the line runs up to the lesson offered; with none offered
  // the module is finished and the whole line is lit.
  const litUpTo = nowIndex === -1 ? count - 1 : nowIndex;
  const litPercent = count > 1 ? (litUpTo / (count - 1)) * 100 : 0;
  // A number inside the template keeps the `${number}%` type React Native wants.
  const litWidth: `${number}%` = `${litPercent}%`;

  return (
    <View
      style={{ gap: 8 }}
      accessibilityLabel={`${route.label} : ${String(route.done)} leçon${route.done > 1 ? "s" : ""} sur ${String(route.total)} faite${route.done > 1 ? "s" : ""}`}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text variant="bodySm" numberOfLines={1} style={{ flexShrink: 1 }}>
          {route.label}
        </Text>
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          {route.done} / {route.total}
        </Text>
      </View>
      <View
        style={{
          height: 20,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 2,
        }}
      >
        {count > 1 ? (
          <>
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 6,
                right: 6,
                top: 9,
                height: 2,
                backgroundColor: colors.borderDefault,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 6,
                top: 9,
                height: 2,
                width: litWidth,
                maxWidth: "100%",
                backgroundColor: theme.accent,
              }}
            />
          </>
        ) : null}
        {route.nodes.map((node) => (
          <View
            key={node.id}
            accessible
            accessibilityLabel={`${node.title}${node.state === "done" ? ", faite" : node.state === "now" ? ", en cours" : ""}`}
            style={
              node.state === "now"
                ? {
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: colors.bgBase,
                    borderWidth: 3,
                    borderColor: theme.accent,
                  }
                : {
                    width: 11,
                    height: 11,
                    borderRadius: 6,
                    backgroundColor: node.state === "done" ? theme.accent : colors.bgElevated,
                    borderWidth: 2,
                    borderColor: node.state === "done" ? theme.accent : colors.borderDefault,
                  }
            }
          />
        ))}
      </View>
    </View>
  );
}
