/**
 * Catalogue filtering for /paths.
 *
 * Domain and track are two independent questions - "which field?" and "a
 * competence, or the job itself?" - so they narrow the list independently and
 * a learner can combine them ("Cybersec" + "Métier" to see the security roles).
 */

export interface FilterablePath {
  title: string;
  description: string;
  category: string;
  track: string;
}

export type DomainFilter = "all" | "CYBERSEC" | "DEV" | "NETWORK";
export type TrackFilter = "all" | "SKILL" | "CAREER";

export interface PathFilters {
  domain: DomainFilter;
  track: TrackFilter;
  search: string;
}

export function filterPaths<T extends FilterablePath>(paths: T[], filters: PathFilters): T[] {
  const needle = filters.search.trim().toLowerCase();
  return paths.filter((path) => {
    if (filters.domain !== "all" && path.category !== filters.domain) return false;
    if (filters.track !== "all" && path.track !== filters.track) return false;
    if (needle === "") return true;
    return (
      path.title.toLowerCase().includes(needle) || path.description.toLowerCase().includes(needle)
    );
  });
}
