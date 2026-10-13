/**
 * A console list's URL with some of its parameters changed.
 *
 * A string sets a parameter, null or an empty string clears it. Any change but
 * the page's own goes back to the first page, since the page the reader was on
 * may not exist in the new list. Pure and free of server imports: the grid
 * builds its links with it in the browser, the pages on the server.
 */
export function gridHref(
  path: string,
  params: Readonly<Record<string, string>>,
  changes: Readonly<Record<string, string | null>> = {},
): string {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") next.delete(key);
    else next.set(key, value);
    if (key !== "page") next.delete("page");
  }
  const query = next.toString();
  return query === "" ? path : `${path}?${query}`;
}

/** "?sort=xp" sorts up, "?sort=-xp" down: the column's key, signed. */
export function sortValue(key: string, dir: "asc" | "desc"): string {
  return dir === "desc" ? `-${key}` : key;
}
