import { Redirect } from "expo-router";
import type React from "react";
import { useSession } from "@/lib/session";

export default function Index(): React.JSX.Element | null {
  const { session, initializing } = useSession();
  if (initializing) return null;
  return <Redirect href={session ? "/home" : "/login"} />;
}
