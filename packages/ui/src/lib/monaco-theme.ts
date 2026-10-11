/**
 * The theme Monaco's `editor.defineTheme` takes, as far as the editors here
 * use it.
 *
 * Monaco reads these colours in JavaScript, never through CSS. A `colors`
 * value is #rrggbb or #rrggbbaa: anything else silently paints red. And
 * `editor.foreground` and `editor.background` are also the default token
 * colours, whose parser throws on anything but hex ("Illegal value for token
 * color"), taking the whole page that holds the editor down with it. A rule's
 * `foreground` is six hex digits, without the '#'.
 */
export interface MonacoTokenRule {
  token: string;
  foreground?: string;
  fontStyle?: string;
}

export interface MonacoTheme {
  base: "vs-dark";
  inherit: boolean;
  rules: MonacoTokenRule[];
  colors: Record<string, string>;
}
