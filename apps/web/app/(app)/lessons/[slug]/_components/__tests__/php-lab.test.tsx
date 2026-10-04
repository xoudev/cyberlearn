// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkerLike } from "@/lib/sql/sandbox";
import { PhpLab } from "../php-lab";

/**
 * The lab as a learner drives it, the PHP replaced by a double that "reads"
 * the one thing the exercise is about: whether the code the learner sends
 * mentions htmlspecialchars. What is tested is the wiring: the request that
 * is sent, the answer that is shown (and what stays out of its reach), the
 * boxes that tick, the check that follows the code.
 */

const escape = (text: string): string =>
  text
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");

interface Sent {
  files: Record<string, string>;
  request: { method: string; path: string; query: string; cookie: string; body: string };
}

function server(sent: Sent[] = [], terminate = vi.fn()): () => WorkerLike {
  return () => {
    const worker: WorkerLike = {
      onmessage: null,
      onerror: null,
      terminate,
      postMessage: (message: unknown) => {
        // SAFETY: the sandbox posts nothing else; a test double reads it as such.
        const m = message as { id: number } & Sent;
        sent.push({ files: m.files, request: m.request });
        const q = new URLSearchParams(m.request.query).get("q") ?? "";
        const safe = (m.files["search.php"] ?? "").includes("htmlspecialchars");
        const response =
          m.request.path === "/missing.php"
            ? { status: 404, headers: [], body: "404 Not Found", fatal: false }
            : {
                status: 200,
                headers: ["X-Powered-By: PHP/8.4.1"],
                body: `<p>Résultats pour : ${safe ? escape(q) : q}</p>`,
                fatal: false,
              };
        queueMicrotask(() => worker.onmessage?.({ data: { id: m.id, response } }));
      },
    };
    return worker;
  };
}

const PROPS = {
  id: "p",
  title: "Le moteur de recherche",
  task: "Attaquez, puis corrigez.",
  file: "search.php",
  code: "<?php echo $_GET['q'];\n",
  requests: [
    { label: "Recherche normale", url: "/search.php?q=php" },
    { label: "Cookie de Bob", url: "/search.php?q=bob", cookie: "session=tok-bob" },
  ],
  checks: [
    { kind: "seen", label: "Du code s'est exécuté", expect: { executable: true } },
    {
      kind: "seen",
      label: "Vu en tant que Bob",
      when: { cookie: "tok-bob" },
      expect: { contains: "Résultats pour" },
    },
    {
      kind: "fixed",
      label: "La balise ne s'exécute plus",
      request: { url: "/search.php?q=%3Cscript%3Ealert(1)%3C/script%3E" },
      expect: { executable: false, contains: "alert(1)" },
    },
    {
      kind: "fixed",
      label: "La recherche marche toujours",
      request: { url: "/search.php?q=PHP" },
      expect: { status: 200, contains: "Résultats pour : PHP" },
    },
  ],
  hints: ["Cherchez où $q est écrit."],
};

afterEach(cleanup);

async function send(address: string): Promise<void> {
  fireEvent.change(screen.getByLabelText("Adresse de la requête"), { target: { value: address } });
  fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
  await screen.findByText(/^HTTP \d+$/u);
}

describe("PhpLab", () => {
  it("starts with the code to read and the first request ready to send", () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    expect(screen.getByText("Attaquez, puis corrigez.")).toBeTruthy();
    expect(screen.getByLabelText<HTMLTextAreaElement>("Code PHP de search.php").value).toBe(
      PROPS.code,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Adresse de la requête").value).toBe(
      "/search.php?q=php",
    );
    expect(screen.getByText("○ Du code s'est exécuté")).toBeTruthy();
    expect(screen.getByText("○ La recherche marche toujours")).toBeTruthy();
  });

  it("sends the code as it stands and shows the answer, in a frame that can do nothing", async () => {
    const sent: Sent[] = [];
    render(<PhpLab {...PROPS} createWorker={server(sent)} />);
    fireEvent.change(screen.getByLabelText("Code PHP de search.php"), {
      target: { value: "<?php echo 'mon code';" },
    });
    await send("/search.php?q=php");
    expect(sent[0]?.files["search.php"]).toBe("<?php echo 'mon code';");
    expect(sent[0]?.request).toMatchObject({ method: "GET", path: "/search.php", query: "q=php" });
    const frame = screen.getByTitle<HTMLIFrameElement>("Aperçu de la page");
    expect(frame.getAttribute("sandbox")).toBe("");
    expect(frame.getAttribute("srcdoc")).toContain("<p>Résultats pour : php</p>");
    expect(frame.getAttribute("srcdoc")).toContain("default-src 'none'");
    expect(screen.getByText("En-têtes (1)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Source" }));
    expect(screen.getByLabelText("Source de la réponse").textContent).toBe(
      "<p>Résultats pour : php</p>",
    );
  });

  it("warns when the browser would run what came back, ticks the box, and still shows nothing running", async () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    await send("/search.php?q=php");
    expect(screen.queryByText(/Le navigateur exécuterait/u)).toBeNull();
    expect(screen.getByText("○ Du code s'est exécuté")).toBeTruthy();

    await send("/search.php?q=%3Cscript%3Ealert(1)%3C/script%3E");
    expect(
      await screen.findByText(/Le navigateur exécuterait du code qui vient de la requête/u),
    ).toBeTruthy();
    expect(screen.getByText(/une balise <script> \(alert\(1\)\)/u)).toBeTruthy();
    expect(screen.getByText("✓ Du code s'est exécuté")).toBeTruthy();
    expect(screen.getByTitle("Aperçu de la page").getAttribute("sandbox")).toBe("");
  });

  it("ticks a box only for the requests it is about: the cookie narrows it", async () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    await send("/search.php?q=php");
    expect(screen.getByText("○ Vu en tant que Bob")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Cookie de la requête"), {
      target: { value: "session=tok-bob" },
    });
    await send("/search.php?q=php");
    expect(screen.getByText("✓ Vu en tant que Bob")).toBeTruthy();
  });

  it("fills the form and sends, from a ready-made request", async () => {
    const sent: Sent[] = [];
    render(<PhpLab {...PROPS} createWorker={server(sent)} />);
    fireEvent.click(screen.getByRole("button", { name: "Cookie de Bob" }));
    await screen.findByText("HTTP 200");
    expect(sent[0]?.request).toMatchObject({ query: "q=bob", cookie: "session=tok-bob" });
    expect(screen.getByLabelText<HTMLInputElement>("Cookie de la requête").value).toBe(
      "session=tok-bob",
    );
    expect(screen.getByLabelText<HTMLInputElement>("Adresse de la requête").value).toBe(
      "/search.php?q=bob",
    );
  });

  it("checks the fix on the code as it stands, and says what is still wrong", async () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    await send("/search.php?q=%3Cscript%3Ealert(1)%3C/script%3E");
    fireEvent.click(screen.getByRole("button", { name: "Vérifier mon correctif" }));
    expect(await screen.findByText("✗ La balise ne s'exécute plus")).toBeTruthy();
    expect(
      screen.getByText(
        "La page contient encore du code exécutable : une balise <script> (alert(1)).",
      ),
    ).toBeTruthy();
    expect(screen.getByText("✓ La recherche marche toujours")).toBeTruthy();
    expect(screen.queryByText(/Exercice complété/u)).toBeNull();
  });

  it("completes the exercise once the code is fixed, and takes the results back when it changes again", async () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    await send("/search.php?q=%3Cscript%3Ealert(1)%3C/script%3E");
    await send("/search.php?q=bob");
    fireEvent.change(screen.getByLabelText("Cookie de la requête"), {
      target: { value: "session=tok-bob" },
    });
    await send("/search.php?q=bob");

    fireEvent.change(screen.getByLabelText("Code PHP de search.php"), {
      target: { value: "<?php echo htmlspecialchars($_GET['q']);" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Vérifier mon correctif" }));
    expect(await screen.findByText("✓ La balise ne s'exécute plus")).toBeTruthy();
    expect(
      screen.getByText("✓ Exercice complété : tout ce qui était demandé est fait."),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Code PHP de search.php"), {
      target: { value: "<?php echo $_GET['q'];" },
    });
    expect(screen.getByText("○ La balise ne s'exécute plus")).toBeTruthy();
    expect(screen.queryByText(/Exercice complété/u)).toBeNull();
    expect(screen.getByText("✓ Du code s'est exécuté")).toBeTruthy();
  });

  it("gives the original code back", () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    const editor = screen.getByLabelText<HTMLTextAreaElement>("Code PHP de search.php");
    const reset = screen.getByRole<HTMLButtonElement>("button", {
      name: "Remettre le code d'origine",
    });
    expect(reset.disabled).toBe(true);
    fireEvent.change(editor, { target: { value: "<?php // à moi" } });
    expect(reset.disabled).toBe(false);
    fireEvent.click(reset);
    expect(editor.value).toBe(PROPS.code);
  });

  it("shows the pages the exercise relies on, read-only, and sends them with the page", async () => {
    const sent: Sent[] = [];
    render(
      <PhpLab
        {...PROPS}
        support={{ "data.php": "<?php return [1, 2];" }}
        createWorker={server(sent)}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "data.php" }));
    expect(screen.getByLabelText("Code PHP de data.php, en lecture seule").textContent).toBe(
      "<?php return [1, 2];",
    );
    expect(screen.queryByLabelText("Code PHP de search.php")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /search\.php/u }));
    await send("/search.php?q=php");
    expect(Object.keys(sent[0]?.files ?? {}).sort()).toEqual(["data.php", "search.php"]);
  });

  it("offers a body for a POST only", () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    expect(screen.queryByLabelText("Corps de la requête")).toBeNull();
    fireEvent.change(screen.getByLabelText("Méthode"), { target: { value: "POST" } });
    expect(screen.getByLabelText("Corps de la requête")).toBeTruthy();
  });

  it("shows a page that is not there as the 404 it is", async () => {
    render(<PhpLab {...PROPS} createWorker={server()} />);
    await send("/missing.php");
    expect(screen.getByText("HTTP 404")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Source" }));
    expect(screen.getByLabelText("Source de la réponse").textContent).toBe("404 Not Found");
  });

  it("says when the server could not answer", async () => {
    const failing = (): WorkerLike => {
      const worker: WorkerLike = {
        onmessage: null,
        onerror: null,
        terminate: () => undefined,
        postMessage: (message: unknown) => {
          // SAFETY: as above.
          const { id } = message as { id: number };
          queueMicrotask(() =>
            worker.onmessage?.({ data: { id, error: "PHP : 404 sur /runtimes/php/x.wasm" } }),
          );
        },
      };
      return worker;
    };
    render(<PhpLab {...PROPS} createWorker={failing} />);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    expect((await screen.findByRole("alert")).textContent).toBe(
      "PHP : 404 sur /runtimes/php/x.wasm",
    );
  });

  it("stops the server when the lesson is left", async () => {
    const terminate = vi.fn();
    const { unmount } = render(<PhpLab {...PROPS} createWorker={server([], terminate)} />);
    await send("/search.php?q=php");
    unmount();
    await waitFor(() => {
      expect(terminate).toHaveBeenCalled();
    });
  });

  it("says what is wrong with a lab rather than breaking the lesson", () => {
    render(<PhpLab {...PROPS} code="<?php vrzno_eval('1');" />);
    expect(screen.getByRole("note").textContent).toContain(
      "Laboratoire PHP indisponible : search.php nomme Vrzno",
    );
  });
});
