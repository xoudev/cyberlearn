/**
 * Moving around a list of options with a keyboard, as arithmetic.
 *
 * A dropdown that is not a <select> has to re-implement everything the browser
 * used to do: where the arrow keys go, what Home and End mean, which option a
 * few typed letters land on. That logic has nothing to do with React and is the
 * part that is actually easy to get subtly wrong - a disabled option that
 * swallows the cursor, a type-ahead that never reaches the option below the one
 * it is on - so it lives here, where it can be read and tested on its own.
 */

export interface NavOption {
  label: string;
  disabled?: boolean;
}

/** Is there anything to land on at all? */
function selectable(option: NavOption): boolean {
  return option.disabled !== true;
}

/**
 * The first option that can be landed on, or null for a list of nothing but
 * disabled entries.
 */
export function firstEnabled(options: readonly NavOption[]): number | null {
  const index = options.findIndex(selectable);
  return index === -1 ? null : index;
}

/** The last one, same rule. */
export function lastEnabled(options: readonly NavOption[]): number | null {
  for (let i = options.length - 1; i >= 0; i--) {
    const option = options[i];
    if (option && selectable(option)) return i;
  }
  return null;
}

/**
 * One step from `from` in the direction of `step`, skipping disabled options.
 *
 * It clamps rather than wraps, which is what a native <select> does and what
 * the ARIA listbox pattern describes: pressing Down at the bottom of the list
 * should do nothing, not jump silently back to the top past everything the
 * person was reading. `from` of -1 means nothing is highlighted yet, so the
 * first press lands on the end of the list the key points away from.
 */
export function moveActive(
  options: readonly NavOption[],
  from: number,
  step: 1 | -1,
): number | null {
  if (from < 0) return step === 1 ? firstEnabled(options) : lastEnabled(options);
  for (let i = from + step; i >= 0 && i < options.length; i += step) {
    const option = options[i];
    if (option && selectable(option)) return i;
  }
  // Nothing further in that direction: stay where we are, unless where we are
  // is itself unreachable (a disabled option can be the initial value).
  const here = options[from];
  return here !== undefined && selectable(here) ? from : null;
}

/** Accents folded and case dropped, so "ré" finds "Réseau". */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Type-ahead: the next option whose label starts with what has been typed.
 *
 * The search starts just after `from` and wraps once, so typing the same
 * letter repeatedly walks through every option beginning with it instead of
 * sticking to the first. `from` of -1 searches from the top.
 */
export function matchTypeahead(
  options: readonly NavOption[],
  query: string,
  from: number,
): number | null {
  const needle = fold(query);
  if (needle === "") return null;
  const count = options.length;
  for (let step = 1; step <= count; step++) {
    const index = (from + step + count) % count;
    const option = options[index];
    if (option && selectable(option) && fold(option.label).startsWith(needle)) return index;
  }
  return null;
}

/** How long a burst of keystrokes counts as one word. */
export const TYPEAHEAD_RESET_MS = 700;
