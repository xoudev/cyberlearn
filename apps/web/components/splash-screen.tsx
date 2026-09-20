import Image from "next/image";
import React from "react";

const SESSION_KEY = "cl-splash-shown";

/**
 * Brand splash, shown on the first page load of a browser session.
 *
 * What was wrong with the previous one was not that it said "use client" - a
 * client component's first render is server-rendered too. It was that it
 * returned null until an effect had set its state, and effects do not run
 * during that render. So the overlay was genuinely absent from the delivered
 * HTML, and could not appear until React had hydrated: measured on a
 * production build, first contentful paint at 1389 ms, splash at 1596 ms, and
 * then 1369 ms sitting on top of a page the reader could already read.
 *
 * The cure is to stop deciding in JavaScript what has to be in the first
 * frame. The markup below renders unconditionally, the animation is in
 * splash-screen.css, and the only script is the once-per-session check - which
 * runs before the overlay is parsed, so a return visit never sees a frame of
 * it. Being a server component now simply follows from needing no hooks.
 *
 * splash-screen.css is imported by app/layout.tsx and not from here, which is
 * load-bearing rather than tidy-minded. Imported from this file, Next split it
 * into its own chunk that is not render-blocking, so the browser painted the
 * overlay before its stylesheet arrived: a stack of unstyled text at the top
 * of the page, shoving the real content down. Imported by the layout it joins
 * the layout's stylesheet, which is in <head> and blocks the first paint - so
 * the overlay is never drawn without its rules. If the import ever moves back
 * here, that flash comes with it.
 */

/**
 * Parser-blocking by design: no src, no async, no defer. It executes where it
 * sits, which is above the overlay in the document, so the attribute is on
 * <html> before the overlay exists and the CSS rule that hides it already
 * applies. Deferring this would turn the skip into a visible flash.
 *
 * Not one character of it is computed. The key travels separately, on the
 * tag's data-splash-key attribute, and the script reads it back off
 * currentScript. Written the obvious way - interpolating the key into the
 * source with JSON.stringify - this built a program out of a string, and
 * CodeQL was right to say so (js/bad-code-sanitization, CWE-094): JSON.stringify
 * escapes for JSON, not for JavaScript source, so the pattern is only ever as
 * safe as the value that happens to be going through it today. An attribute is
 * data, React escapes it as data, and there is no code construction left to
 * get wrong if this key ever stops being a literal.
 *
 * The key and its lifetime are quoted in the privacy page's storage table; it
 * dies with the tab, and it is the reason a reload does not replay the
 * animation.
 */
const SKIP_SCRIPT =
  "try{var k=document.currentScript&&document.currentScript.dataset.splashKey;" +
  "if(k){if(sessionStorage.getItem(k)){" +
  "document.documentElement.setAttribute('data-splash-seen','')" +
  "}else{sessionStorage.setItem(k,'1')}}}catch(e){}";

/** Without scripting there is no session marker, so it would play on every page. */
const NOSCRIPT_CSS = `[data-splash]{display:none}`;

export function SplashScreen({ nonce }: { nonce?: string }): React.ReactElement {
  return (
    <>
      {/* A fixed string, and the key beside it as data rather than as code. */}
      <script
        nonce={nonce}
        data-splash-key={SESSION_KEY}
        dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }}
      />
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: NOSCRIPT_CSS }} />
      </noscript>

      <div aria-hidden="true" data-splash="true">
        <div className="cl-splash-mark">
          <span className="cl-splash-ring" />
          <Image
            src="/Logo_principal.png"
            alt=""
            width={52}
            height={52}
            priority
            style={{ objectFit: "contain" }}
          />
        </div>

        <div className="cl-splash-words">
          <div className="cl-splash-wordmark">
            cyber<em>learn</em>
          </div>
          <div className="cl-splash-caption">Chargement sécurisé</div>
        </div>

        <div className="cl-splash-bar">
          <div className="cl-splash-bar-fill" />
        </div>
      </div>
    </>
  );
}
