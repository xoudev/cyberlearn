import Image from "next/image";
import React from "react";

const SESSION_KEY = "cl-admin-splash-shown";

/**
 * Console splash, shown on the first load of a browser session.
 *
 * Same defect and same cure as the site's, whose comment carries the numbers:
 * the old one returned null until an effect had set its state, so it was
 * absent from the delivered HTML and could not appear until the console had
 * hydrated - after the dashboard was already on screen. The markup below
 * renders unconditionally and the animation is in splash-screen.css.
 *
 * That stylesheet is imported by app/layout.tsx, not from here: imported from
 * this file Next gives it its own non-render-blocking chunk, and the overlay
 * gets painted before its rules arrive. The site's copy carries the longer
 * note.
 */

/**
 * Parser-blocking by design: it executes where it sits, above the overlay, so
 * a return visit in the same tab never sees a frame of it. The console's CSP
 * allows inline scripts ('unsafe-inline' for Monaco), so there is no nonce to
 * thread through here - unlike the site, whose policy is nonce-based.
 *
 * Fixed text, with the key carried as data on the tag rather than interpolated
 * into the source. The site's copy explains why; the short version is that
 * JSON.stringify escapes for JSON and not for JavaScript, so using it to build
 * a program is a habit worth not having.
 */
const SKIP_SCRIPT =
  "try{var k=document.currentScript&&document.currentScript.dataset.splashKey;" +
  "if(k){if(sessionStorage.getItem(k)){" +
  "document.documentElement.setAttribute('data-splash-seen','')" +
  "}else{sessionStorage.setItem(k,'1')}}}catch(e){}";

/** Without scripting there is no session marker, so it would play on every page. */
const NOSCRIPT_CSS = `[data-splash]{display:none}`;

export function AdminSplashScreen(): React.ReactElement {
  return (
    <>
      {/* A fixed string, and the key beside it as data rather than as code. */}
      <script data-splash-key={SESSION_KEY} dangerouslySetInnerHTML={{ __html: SKIP_SCRIPT }} />
      <noscript>
        <style dangerouslySetInnerHTML={{ __html: NOSCRIPT_CSS }} />
      </noscript>

      <div aria-hidden="true" data-splash="true">
        <div className="cl-splash-mark">
          <Image
            src="/Admin_logo.png"
            alt=""
            width={190}
            height={42}
            priority
            style={{ width: "auto", height: 42, objectFit: "contain" }}
          />
        </div>

        <div className="cl-splash-caption">Console d&apos;administration</div>

        <div className="cl-splash-bar">
          <div className="cl-splash-bar-fill" />
        </div>
      </div>
    </>
  );
}
