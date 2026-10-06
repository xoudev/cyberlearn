import React, { useState } from "react";
import { Image, View, type ViewStyle } from "react-native";
import { SvgUri } from "react-native-svg";
import { colors } from "@cyberlearn/tokens";
import { SITE_URL } from "@/lib/api";
import { illustrationUri } from "@/lib/path-covers";
import { usePathCovers } from "@/lib/queries";
import { useSession } from "@/lib/session";

/**
 * A path's cover, as on the site: the image sent from the console, else the
 * path's illustration (loaded from the site, like the badge icons). An image
 * that does not load gives way to the illustration; while the covers load,
 * the frame keeps its place, empty. Decorative: hidden from screen readers.
 */
export function PathCover({ slug, style }: { slug: string; style?: ViewStyle }): React.JSX.Element {
  const { session } = useSession();
  const { data } = usePathCovers(session?.user.id);
  const cover = data?.get(slug);
  // The address that failed, not a flag: a newly signed one gets its chance.
  const [failed, setFailed] = useState<string | null>(null);

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          overflow: "hidden",
          backgroundColor: colors.bgBase,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderDefault,
        },
        style,
      ]}
    >
      {cover?.image && cover.image !== failed ? (
        <Image
          source={{ uri: cover.image }}
          resizeMode="cover"
          style={{ width: "100%", height: "100%" }}
          onError={() => {
            setFailed(cover.image);
          }}
        />
      ) : cover ? (
        <SvgUri
          uri={illustrationUri(cover, SITE_URL)}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid slice"
        />
      ) : null}
    </View>
  );
}
