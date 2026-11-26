"use client";

// "use client" justified: a floating panel that opens and closes, follows new
// messages live (Supabase Realtime) and keeps the conversation being read in
// state while the page underneath stays where it is.

import React, { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { MESSAGE_BODY_MAX } from "@cyberlearn/lib/messages/rules";
import { NOTE_REPORT_REASON_LABELS } from "@cyberlearn/lib/notes/report-reasons";
import type { ThreadMessage } from "@cyberlearn/db";
import type { ConversationView as ConversationSummary } from "@/lib/messages/messages";
import {
  answerRequestAction,
  blockConversationAction,
  conversationWithAction,
  getInboxAction,
  getThreadAction,
  reportMessageAction,
  searchRecipientsAction,
  sendMessageAction,
} from "@/app/(app)/_actions/message-actions";
import { OPEN_MESSAGES_EVENT, type OpenMessagesDetail } from "./open-messages";
import "./messages-dock.css";

interface Person {
  id: string;
  displayName: string;
  username: string | null;
  /** Their own photo, when they uploaded one; initials otherwise. */
  photo?: string | null;
}

type View =
  | { kind: "list" }
  | { kind: "thread"; conversationId: string }
  /** Writing to somebody with no conversation yet: it starts with the first message. */
  | { kind: "draft"; person: Person }
  | { kind: "new" };

const TEAM_NAME = "Équipe CyberLearn";
const LOAD_FAILED = "Les messages n'ont pas pu être chargés. Réessaie.";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}` : name.slice(0, 2);
  return letters.toUpperCase() || "?";
}

/** The name a person is shown by: the display name, else the @handle, else `fallback`. */
function personName(
  person: { displayName: string; username: string | null } | null | undefined,
  fallback: string,
): string {
  if (person == null) return fallback;
  if (person.displayName.trim() !== "") return person.displayName;
  return person.username ?? fallback;
}

function Avatar({ person, team }: { person: Person | null; team?: boolean }): React.JSX.Element {
  if (team === true || person === null) {
    return (
      <span className="msg-avatar msg-avatar-team" aria-hidden="true">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </span>
    );
  }
  if (typeof person.photo === "string") {
    return (
      // A signed address of a private bucket, valid for a short while: not
      // something next/image can cache or optimise.
      // eslint-disable-next-line @next/next/no-img-element
      <img className="msg-avatar" src={person.photo} alt="" aria-hidden="true" />
    );
  }
  return (
    <span className="msg-avatar" aria-hidden="true">
      {initials(personName(person, "?"))}
    </span>
  );
}

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "10:42" today, "hier", "lun." this week, "12/11" before. */
function listTime(value: Date | string): string {
  const date = new Date(value);
  const now = new Date();
  if (sameDay(date, now)) {
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "hier";
  if (now.getTime() - date.getTime() < 6 * 86_400_000) {
    return date.toLocaleDateString("fr-FR", { weekday: "short" });
  }
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

function dayLabel(value: Date | string): string {
  const date = new Date(value);
  const now = new Date();
  if (sameDay(date, now)) return "Aujourd'hui";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

function nameOf(c: ConversationSummary): string {
  return c.kind === "TEAM" ? TEAM_NAME : personName(c.other, "Compte supprimé");
}

/** The team first, then the newest. */
function ordered(list: readonly ConversationSummary[]): ConversationSummary[] {
  return [...list].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "TEAM" ? -1 : 1;
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
  });
}

/**
 * The messages button, at the bottom right of every signed-in page, and the
 * panel it opens: the conversations (and the requests waiting for an answer),
 * one conversation at a time, and a new message to a friend or a @pseudo.
 */
export function MessagesDock({ userId }: { userId: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });
  const [tab, setTab] = useState<"discussions" | "requests">("discussions");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [unread, setUnread] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const viewRef = useRef<View>(view);
  viewRef.current = view;
  const [threadVersion, setThreadVersion] = useState(0);

  const loadInbox = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await getInboxAction();
        setConversations(res.conversations);
        setUnread(res.unread);
        setFailure(null);
      } catch {
        setFailure(LOAD_FAILED);
      }
    });
  }, []);

  // The count on the button, once the page is up.
  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // New messages, live. The policy on direct_messages lets a subscriber see
  // the rows of its own conversations only.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    // Read through a function: the cleanup's write happens between the awaits.
    const run = { cancelled: false };
    const cancelled = (): boolean => run.cancelled;
    void (async () => {
      // The socket must carry the session's token before the channel joins:
      // the browser client reads its session from the cookie later, and a
      // channel joined with the anon key is let through the policy as nobody,
      // so it never receives a row.
      const { data } = await supabase.auth.getSession();
      if (cancelled()) return;
      await supabase.realtime.setAuth(data.session?.access_token ?? null);
      if (cancelled()) return;
      // A name of its own per subscription: realtime-js hands back the channel
      // already open under a name, and the one an earlier cleanup is closing
      // (React runs this effect twice in development) would never deliver.
      channel = supabase
        .channel(`direct-messages:${userId}:${crypto.randomUUID()}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "direct_messages" },
          (payload) => {
            // Realtime types the row loosely; only its conversation is read.
            const row = payload.new as { conversationId?: string };
            const current = viewRef.current;
            if (current.kind === "thread" && current.conversationId === row.conversationId) {
              setThreadVersion((v) => v + 1);
            }
            loadInbox();
          },
        )
        .subscribe();
    })();
    return () => {
      run.cancelled = true;
      if (channel !== null) void supabase.removeChannel(channel);
    };
  }, [userId, loadInbox]);

  // A page asks for a conversation with somebody: theirs if it exists, a draft otherwise.
  useEffect(() => {
    const onOpen = (event: Event): void => {
      const detail = (event as CustomEvent<OpenMessagesDetail>).detail; // dispatched by openMessagesWith, typed there
      setOpen(true);
      startTransition(async () => {
        const res = await conversationWithAction(detail.userId);
        if (res.ok && res.conversationId !== null) {
          setView({ kind: "thread", conversationId: res.conversationId });
        } else {
          setView({
            kind: "draft",
            person: {
              id: detail.userId,
              displayName: detail.displayName,
              username: detail.username,
            },
          });
        }
      });
    };
    window.addEventListener(OPEN_MESSAGES_EVENT, onOpen);
    return () => {
      window.removeEventListener(OPEN_MESSAGES_EVENT, onOpen);
    };
  }, []);

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (): void => {
    const next = !open;
    setOpen(next);
    if (next) loadInbox();
  };

  const requests = conversations.filter((c) => c.incomingRequest);
  const discussions = ordered(conversations.filter((c) => !c.incomingRequest));
  const requestCount = requests.length;

  return (
    <div className={open ? "msg-panel-open" : undefined}>
      {open && (
        <section className="msg-panel" aria-label="Messages">
          {view.kind === "list" && (
            <>
              <header className="msg-head">
                <div className="msg-head-title">
                  <h2 className="msg-title" style={{ margin: 0 }}>
                    Messages
                  </h2>
                </div>
                <button
                  type="button"
                  className="msg-icon-btn"
                  aria-label="Nouveau message"
                  onClick={() => {
                    setView({ kind: "new" });
                  }}
                >
                  <PenIcon />
                </button>
                <button
                  type="button"
                  className="msg-icon-btn"
                  aria-label="Fermer les messages"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  <CloseIcon />
                </button>
              </header>
              <div className="msg-tabs" role="tablist" aria-label="Messages">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "discussions"}
                  className="msg-tab"
                  onClick={() => {
                    setTab("discussions");
                  }}
                >
                  Discussions
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "requests"}
                  className="msg-tab"
                  onClick={() => {
                    setTab("requests");
                  }}
                >
                  Demandes
                  {requestCount > 0 && <span className="msg-tab-count">{requestCount}</span>}
                </button>
              </div>
              <div className="msg-scroll" role="tabpanel">
                {failure !== null && (
                  <p className="msg-error" style={{ paddingTop: 12 }}>
                    {failure}
                  </p>
                )}
                {(tab === "discussions" ? discussions : requests).map((c) => (
                  <ConversationRow
                    key={c.id}
                    conversation={c}
                    onOpen={() => {
                      setView({ kind: "thread", conversationId: c.id });
                    }}
                  />
                ))}
                {tab === "discussions" && discussions.length === 0 && failure === null && (
                  <p className="msg-empty">
                    Aucune discussion pour l&apos;instant. Écris à un ami avec le crayon en haut du
                    panneau.
                  </p>
                )}
                {tab === "requests" && requests.length === 0 && (
                  <p className="msg-empty">
                    Aucune demande. Quand un compte qui n&apos;est pas ton ami t&apos;écrit, son
                    message arrive ici : tu choisis de l&apos;accepter ou non.
                  </p>
                )}
              </div>
              {/* The settings drawer catches this link and opens on the section. */}
              <footer className="msg-foot">
                <a
                  href="/settings/privacy"
                  className="msg-link-btn"
                  onClick={() => {
                    setOpen(false);
                  }}
                >
                  Comptes bloqués et qui peut m&apos;écrire
                </a>
              </footer>
            </>
          )}

          {view.kind === "new" && (
            <NewMessage
              onBack={() => {
                setView({ kind: "list" });
              }}
              onPick={(person) => {
                startTransition(async () => {
                  const res = await conversationWithAction(person.id);
                  setView(
                    res.ok && res.conversationId !== null
                      ? { kind: "thread", conversationId: res.conversationId }
                      : { kind: "draft", person },
                  );
                });
              }}
            />
          )}

          {(view.kind === "thread" || view.kind === "draft") && (
            <Conversation
              key={view.kind === "thread" ? view.conversationId : `draft-${view.person.id}`}
              view={view}
              version={threadVersion}
              onBack={() => {
                setView({ kind: "list" });
                loadInbox();
              }}
              onStarted={(conversationId) => {
                setView({ kind: "thread", conversationId });
                loadInbox();
              }}
              onChanged={loadInbox}
            />
          )}
        </section>
      )}

      <button
        type="button"
        className="msg-fab"
        aria-expanded={open}
        aria-label={unread > 0 ? `Messages, ${String(unread)} non lus` : "Messages"}
        onClick={toggle}
      >
        <ChatIcon />
        {unread > 0 && <span className="msg-fab-count">{unread > 99 ? "99+" : unread}</span>}
      </button>
    </div>
  );
}

function ConversationRow({
  conversation: c,
  onOpen,
}: {
  conversation: ConversationSummary;
  onOpen: () => void;
}): React.JSX.Element {
  const team = c.kind === "TEAM";
  const classes = ["msg-row", team ? "msg-row-team" : "", c.unread ? "msg-row-unread" : ""].join(
    " ",
  );
  const preview =
    c.lastMessage === null ? "" : `${c.lastMessage.mine ? "Toi : " : ""}${c.lastMessage.body}`;
  return (
    <button type="button" className={classes} onClick={onOpen}>
      <Avatar person={c.other} team={team} />
      <span className="msg-row-main">
        <span className="msg-row-name" style={{ display: "block" }}>
          {nameOf(c)}
          {team ? (
            <span className="msg-tag">Officiel</span>
          ) : (
            c.other?.username && <span className="msg-row-handle">@{c.other.username}</span>
          )}
          {c.outgoingRequest && <span className="msg-tag">En attente</span>}
        </span>
        <span className="msg-row-last" style={{ display: "block" }}>
          {preview}
        </span>
      </span>
      <span className="msg-row-side">
        <span className="msg-meta">{listTime(c.lastMessageAt)}</span>
        {c.unread && <span className="msg-dot" aria-label="Non lu" />}
      </span>
    </button>
  );
}

function NewMessage({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (person: Person) => void;
}): React.JSX.Element {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<
    {
      id: string;
      username: string | null;
      displayName: string;
      photo: string | null;
      friend: boolean;
    }[]
  >([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const res = await searchRecipientsAction(q);
        setPeople(res.ok ? res.people : []);
      });
    }, 200);
    return () => {
      window.clearTimeout(handle);
    };
  }, [q]);

  return (
    <>
      <header className="msg-head">
        <button type="button" className="msg-icon-btn" aria-label="Retour" onClick={onBack}>
          <BackIcon />
        </button>
        <div className="msg-head-title">
          <h2 className="msg-title" style={{ margin: 0 }}>
            Nouveau message
          </h2>
        </div>
      </header>
      <div className="msg-search">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
          }}
          placeholder="Un ami, ou un @pseudo"
          aria-label="À qui écrire"
          autoFocus
        />
      </div>
      <div className="msg-scroll">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            className="msg-row"
            onClick={() => {
              onPick(p);
            }}
          >
            <Avatar person={p} />
            <span className="msg-row-main">
              <span className="msg-row-name" style={{ display: "block" }}>
                {personName(p, "")}
                {p.username && <span className="msg-row-handle">@{p.username}</span>}
              </span>
              <span className="msg-row-last" style={{ display: "block" }}>
                {p.friend ? "Ami" : "Pas encore ami : ton message sera une demande"}
              </span>
            </span>
          </button>
        ))}
        {people.length === 0 && (
          <p className="msg-empty">
            {q.trim() === ""
              ? "Tes amis apparaissent ici. Pour écrire à quelqu'un d'autre, tape son @pseudo exact."
              : "Personne ne correspond. Un compte qui n'est pas ton ami se trouve par son @pseudo exact."}
          </p>
        )}
      </div>
    </>
  );
}

function Conversation({
  view,
  version,
  onBack,
  onStarted,
  onChanged,
}: {
  view: Extract<View, { kind: "thread" } | { kind: "draft" }>;
  version: number;
  onBack: () => void;
  onStarted: (conversationId: string) => void;
  onChanged: () => void;
}): React.JSX.Element {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [reporting, setReporting] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const conversationId = view.kind === "thread" ? view.conversationId : null;

  const load = useCallback(
    (before?: string) => {
      if (conversationId === null) return;
      startTransition(async () => {
        try {
          const res = await getThreadAction({ conversationId, before });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setSummary(res.conversation);
          setHasMore(res.hasMore);
          setMessages((prev) => (before === undefined ? res.messages : [...res.messages, ...prev]));
          setError(null);
          // The latest page marks it read: the count on the button follows.
          if (before === undefined) onChanged();
        } catch {
          setError(LOAD_FAILED);
        }
      });
    },
    [conversationId, onChanged],
  );

  useEffect(() => {
    load();
  }, [load, version]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const team = summary?.kind === "TEAM";
  const person: Person | null = view.kind === "draft" ? view.person : (summary?.other ?? null);
  const title =
    view.kind === "draft" ? personName(view.person, "") : summary ? nameOf(summary) : "";

  const answer = (choice: "accept" | "decline"): void => {
    if (conversationId === null) return;
    startTransition(async () => {
      const res = await answerRequestAction({ conversationId, answer: choice });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChanged();
      if (choice === "decline") onBack();
      else load();
    });
  };

  const block = (): void => {
    if (conversationId === null) return;
    setMenu(false);
    if (
      !window.confirm(
        `Bloquer ${title} ? Vous ne pourrez plus vous écrire, ni l'un ni l'autre. Tu pourras le débloquer dans Paramètres, Confidentialité.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await blockConversationAction({ conversationId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onChanged();
      onBack();
    });
  };

  const send = (text: string, done: () => void): void => {
    startTransition(async () => {
      const res = await sendMessageAction(
        conversationId !== null
          ? { conversationId, body: text }
          : { recipientId: view.kind === "draft" ? view.person.id : "", body: text },
      );
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      done();
      if (conversationId === null) {
        onStarted(res.conversationId);
        return;
      }
      setMessages((prev) => [...prev, res.message]);
      onChanged();
    });
  };

  const incoming = summary?.incomingRequest === true;
  const waiting = summary?.outgoingRequest === true;
  const handle = team ? "Compte officiel" : person?.username ? `@${person.username}` : "";

  return (
    <>
      <header className="msg-head" style={{ position: "relative" }}>
        <button
          type="button"
          className="msg-icon-btn"
          aria-label="Retour aux discussions"
          onClick={onBack}
        >
          <BackIcon />
        </button>
        <Avatar person={person} team={team} />
        <div className="msg-head-title">
          <div className="msg-row-name">{title}</div>
          <div className="msg-meta" style={{ textTransform: team ? "uppercase" : "none" }}>
            {handle}
          </div>
        </div>
        {!team && conversationId !== null && (
          <button
            type="button"
            className="msg-icon-btn"
            aria-label="Options de la discussion"
            aria-expanded={menu}
            onClick={() => {
              setMenu((m) => !m);
            }}
          >
            <DotsIcon />
          </button>
        )}
        {menu && (
          <div className="msg-menu" role="menu">
            <button type="button" role="menuitem" onClick={block}>
              Bloquer ce compte
            </button>
          </div>
        )}
      </header>

      <div className="msg-scroll">
        <div className="msg-thread">
          {hasMore && (
            <button
              type="button"
              className="msg-link-btn"
              style={{ alignSelf: "center" }}
              onClick={() => {
                const first = messages[0];
                if (first) load(new Date(first.createdAt).toISOString());
              }}
            >
              Messages plus anciens
            </button>
          )}
          {view.kind === "draft" && (
            <p className="msg-empty" style={{ padding: "20px 4px" }}>
              Écris ton premier message à {title}.
            </p>
          )}
          {messages.map((m, i) => {
            const previous = messages[i - 1];
            const newDay =
              previous === undefined ||
              !sameDay(new Date(previous.createdAt), new Date(m.createdAt));
            return (
              <React.Fragment key={m.id}>
                {newDay && <span className="msg-meta msg-day">{dayLabel(m.createdAt)}</span>}
                <div
                  className={`msg-bubble-wrap ${m.mine ? "msg-bubble-wrap-mine" : "msg-bubble-wrap-theirs"}`}
                >
                  <div className={`msg-bubble ${m.mine ? "msg-bubble-mine" : "msg-bubble-theirs"}`}>
                    {m.body}
                  </div>
                  {!m.mine && !m.fromTeam && reporting !== m.id && (
                    <div className="msg-bubble-actions">
                      <button
                        type="button"
                        className="msg-link-btn"
                        onClick={() => {
                          setReporting(m.id);
                          setNotice(null);
                        }}
                      >
                        Signaler
                      </button>
                    </div>
                  )}
                  {reporting === m.id && (
                    <ReportForm
                      messageId={m.id}
                      onDone={(text) => {
                        setReporting(null);
                        setNotice(text);
                      }}
                    />
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {incoming && (
            <div className="msg-card">
              <div className="msg-card-title">{title} veut t&apos;écrire</div>
              <div style={{ color: "var(--color-text-secondary)" }}>
                Tant que tu n&apos;as pas accepté, ce compte ne voit pas que tu as lu son message,
                et ne peut pas t&apos;en envoyer d&apos;autre.
              </div>
              <div className="msg-actions">
                <button
                  type="button"
                  className="msg-btn msg-btn-primary"
                  disabled={pending}
                  onClick={() => {
                    answer("accept");
                  }}
                >
                  Accepter
                </button>
                <button
                  type="button"
                  className="msg-btn"
                  disabled={pending}
                  onClick={() => {
                    answer("decline");
                  }}
                >
                  Refuser
                </button>
                <button
                  type="button"
                  className="msg-btn msg-btn-danger"
                  disabled={pending}
                  onClick={block}
                >
                  Bloquer
                </button>
              </div>
            </div>
          )}
          <div ref={bottom} />
        </div>
      </div>

      {notice !== null && <p className="msg-note">{notice}</p>}
      {error !== null && (
        <p className="msg-error" role="alert" style={{ paddingTop: 10 }}>
          {error}
        </p>
      )}

      {waiting ? (
        <p className="msg-note">
          Ta demande attend sa réponse. Tu pourras écrire de nouveau quand {title} l&apos;aura
          acceptée.
        </p>
      ) : incoming ? null : (
        <Composer
          placeholder={team ? "Répondre à l'équipe…" : "Écrire un message…"}
          disabled={pending}
          onSend={send}
        />
      )}
    </>
  );
}

function Composer({
  placeholder,
  disabled,
  onSend,
}: {
  placeholder: string;
  disabled: boolean;
  onSend: (text: string, done: () => void) => void;
}): React.JSX.Element {
  const [text, setText] = useState("");
  const trimmed = text.trim();
  const submit = (): void => {
    if (trimmed === "" || disabled) return;
    onSend(trimmed, () => {
      setText("");
    });
  };
  return (
    <form
      className="msg-compose"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        value={text}
        rows={1}
        maxLength={MESSAGE_BODY_MAX}
        placeholder={placeholder}
        aria-label="Message"
        onChange={(e) => {
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          // Enter sends, Shift + Enter breaks the line.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
      />
      <button
        type="submit"
        className="msg-send"
        aria-label="Envoyer"
        disabled={disabled || trimmed === ""}
      >
        <SendIcon />
      </button>
    </form>
  );
}

const REASONS = Object.entries(NOTE_REPORT_REASON_LABELS) as [
  keyof typeof NOTE_REPORT_REASON_LABELS,
  string,
][]; // Object.entries widens the keys; the labels' keys are the reasons

function ReportForm({
  messageId,
  onDone,
}: {
  messageId: string;
  onDone: (notice: string | null) => void;
}): React.JSX.Element {
  const [reason, setReason] = useState<string>("HATE");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="msg-report msg-card"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await reportMessageAction({ messageId, reason, comment: comment.trim() });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          onDone(
            "Message signalé. L'équipe le lira, lui seul : le reste de la discussion reste privé.",
          );
        });
      }}
    >
      <label className="msg-card-title" htmlFor={`reason-${messageId}`}>
        Signaler ce message
      </label>
      <select
        id={`reason-${messageId}`}
        value={reason}
        onChange={(e) => {
          setReason(e.target.value);
        }}
      >
        {REASONS.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <textarea
        rows={2}
        maxLength={500}
        value={comment}
        placeholder="Un détail pour l'équipe (facultatif)"
        aria-label="Détail du signalement"
        onChange={(e) => {
          setComment(e.target.value);
        }}
      />
      {error !== null && (
        <p style={{ margin: 0, color: "var(--color-danger, #ff8a80)" }}>{error}</p>
      )}
      <div className="msg-actions" style={{ marginTop: 0 }}>
        <button type="submit" className="msg-btn msg-btn-primary" disabled={pending}>
          Signaler
        </button>
        <button
          type="button"
          className="msg-btn"
          onClick={() => {
            onDone(null);
          }}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

function ChatIcon(): React.JSX.Element {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 5h16v11H9l-5 4z" />
    </svg>
  );
}
function PenIcon(): React.JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 20h4L19 9l-4-4L4 16z" />
    </svg>
  );
}
function CloseIcon(): React.JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function BackIcon(): React.JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
function DotsIcon(): React.JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
function SendIcon(): React.JSX.Element {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 12l16-8-6 16-3-7z" />
    </svg>
  );
}
