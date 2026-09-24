import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { renderNoteMarkdown } from "../render-note";

/**
 * What notes and forum posts render to on the site. Recorded from the renderer
 * before its parsing moved to @cyberlearn/lib/markdown/note-markdown, so the
 * move is held to changing nothing a reader can see.
 */
const CASES: [name: string, markdown: string, html: string][] = [
  ["plain", "Bonjour tout le monde", "<p>Bonjour tout le monde</p>"],
  [
    "softBreaks",
    "ligne un\nligne deux\r\nligne trois",
    "<p>ligne un<br/>ligne deux<br/>ligne trois</p>",
  ],
  ["paragraphs", "premier\n\nsecond", "<p>premier</p><p>second</p>"],
  [
    "inline",
    "du **gras**, de l'*italique*, du __gras__ et _italique_, du `code`",
    "<p>du <strong>gras</strong>, de l&#x27;<em>italique</em>, du <strong>gras</strong> et <em>italique</em>, du <code>code</code></p>",
  ],
  [
    "nested",
    "**gras avec *italique* dedans**",
    "<p><strong>gras avec <em>italique</em> dedans</strong></p>",
  ],
  [
    "links",
    "[nmap](https://nmap.org) et [mail](mailto:a@b.fr) mais pas [x](javascript:alert(1))",
    '<p><a href="https://nmap.org" target="_blank" rel="noopener noreferrer">nmap</a> et <a href="mailto:a@b.fr" target="_blank" rel="noopener noreferrer">mail</a> mais pas [x](javascript:alert(1))</p>',
  ],
  [
    "linkLabel",
    "[**gras** lien](https://example.org/a_b)",
    '<p><a href="https://example.org/a_b" target="_blank" rel="noopener noreferrer"><strong>gras</strong> lien</a></p>',
  ],
  [
    "unclosed",
    "un ` seul et un **gras pas fermé et [crochet",
    "<p>un ` seul et un **gras pas fermé et [crochet</p>",
  ],
  [
    "headings",
    "# Titre\n## Sous-titre\n###### Six\n####### sept",
    "<h1>Titre</h1><h2>Sous-titre</h2><h6>Six</h6><p>####### sept</p>",
  ],
  [
    "code",
    "avant\n```bash\nnmap -sV 10.0.0.1\n  indent <b>\n```\naprès",
    "<p>avant</p><pre><code>nmap -sV 10.0.0.1\n  indent &lt;b&gt;</code></pre><p>après</p>",
  ],
  ["unclosedFence", "```\ncode sans fin", "<pre><code>code sans fin</code></pre>"],
  ["hr", "haut\n---\nbas\n***\n___", "<p>haut</p><hr/><p>bas</p><hr/><hr/>"],
  [
    "quote",
    "> citation\n> suite\n>sans espace\nhors",
    "<blockquote><p>citation<br/>suite<br/>sans espace</p></blockquote><p>hors</p>",
  ],
  [
    "ul",
    "- un\n* deux\n+ trois\n  - quatre",
    "<ul><li>un</li><li>deux</li><li>trois</li><li>quatre</li></ul>",
  ],
  ["ol", "1. un\n2. deux\n10. dix", "<ol><li>un</li><li>deux</li><li>dix</li></ol>"],
  [
    "mixed",
    "intro\n- a\n1. b\n> c\n# d\ntexte",
    "<p>intro</p><ul><li>a</li></ul><ol><li>b</li></ol><blockquote><p>c</p></blockquote><h1>d</h1><p>texte</p>",
  ],
  [
    "html",
    "<script>alert(1)</script> & <b>pas du html</b>",
    "<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;b&gt;pas du html&lt;/b&gt;</p>",
  ],
  ["empty", "", ""],
  ["blanks", "\n\n  \n", ""],
  [
    "underscoreWords",
    "snake_case_name et __init__",
    "<p>snake<em>case</em>name et <strong>init</strong></p>",
  ],
];

function html(markdown: string): string {
  return renderToStaticMarkup(<>{renderNoteMarkdown(markdown)}</>);
}

describe("renderNoteMarkdown", () => {
  it.each(CASES)("%s", (_name, markdown, expected) => {
    expect(html(markdown)).toBe(expected);
  });
});
