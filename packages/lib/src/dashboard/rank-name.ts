/** The rank a level earns, and the next one, as the home page names them. */

const RANKS: { below: number; name: string }[] = [
  { below: 5, name: "Novice" },
  { below: 10, name: "Apprenti confirmé" },
  { below: 20, name: "Technicien" },
  { below: 35, name: "Analyste" },
  { below: 50, name: "Expert" },
  { below: 70, name: "Architecte" },
];

export function rankName(level: number): string {
  return RANKS.find((rank) => level < rank.below)?.name ?? "Maître Cyber";
}

export function nextRankName(level: number): string {
  const index = RANKS.findIndex((rank) => level < rank.below);
  if (index === -1) return "Légendaire";
  return RANKS[index + 1]?.name ?? "Maître Cyber";
}
