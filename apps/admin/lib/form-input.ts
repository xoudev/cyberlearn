import { useState, type SyntheticEvent } from "react";

/**
 * What a console form does with what was typed once its action has answered.
 *
 * React 19 resets a form after the function handed to <form action> settles,
 * whatever that function returned: every field the form does not control goes
 * back to its defaultValue. On a refusal - a refCode already taken, a lesson
 * whose MDX does not render, a ticket closed in the meantime - that meant the
 * error showed up over a form that had quietly gone back to the saved values,
 * or to nothing, and the next save wrote the old metadata. The console's
 * Select made it worse: its hidden <select> went back to its first value while
 * the control kept showing the one picked.
 *
 * React resets the form by calling form.reset(), which fires a cancelable
 * "reset" event, and it lets the form's own handlers run for exactly that
 * call. Cancelling it keeps the fields as they are.
 */
export function keepFormInput(event: SyntheticEvent<HTMLFormElement>): void {
  event.preventDefault();
}

/**
 * A key for a form that should start over after an action that worked, and
 * only then: a "create" form that stays on the page, a reply box.
 *
 * Remounting is how it starts over rather than form.reset(), which
 * keepFormInput refuses anyway: a remount also puts the console's Select back
 * on its default, and a native reset leaves that control showing the old
 * choice over a field that no longer holds it.
 *
 * `state` is what useActionState returns, a new object for every answer. The
 * key moves in the same render as that answer, so the form empties as its
 * confirmation appears. This is React's pattern for adjusting state to a new
 * value from a previous render, not an effect.
 */
export function useSuccessKey<S>(state: S, succeeded: (state: S) => boolean): number {
  const [seen, setSeen] = useState(state);
  const [key, setKey] = useState(0);
  if (seen !== state) {
    setSeen(state);
    if (succeeded(state)) setKey((current) => current + 1);
  }
  return key;
}
