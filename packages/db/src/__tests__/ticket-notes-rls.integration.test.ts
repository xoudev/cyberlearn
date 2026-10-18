/**
 * ticket_notes over the Data API: the team's notes on a ticket, which the
 * person who opened that ticket must never read.
 *
 * ticket_messages follows its ticket, so the requester reads their thread.
 * ticket_notes does not: no client role holds a privilege on it, and its one
 * policy is for an administrator. The assignee column rides on
 * contact_tickets, which no client role reaches either.
 *
 * Runs against the local Supabase stack CI starts; skips without it.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const EMAIL = "ticket-notes-rls@test.cyberlearn.internal";
const PASSWORD = "TestPassword123!";
const NOTE_BODY = "Compte déjà averti deux fois : ne pas lever sans relire le forum.";

describe("ticket_notes RLS (integration)", () => {
  let url = "";
  let anonKey = "";
  let admin: SupabaseClient;
  let configured = false;
  let userId = "";
  const ticketId = randomUUID();
  const noteId = randomUUID();

  async function cleanup(): Promise<void> {
    await admin.from("contact_tickets").delete().eq("id", ticketId);
    const { data } = await admin.auth.admin.listUsers();
    const existing = data.users.find((u) => u.email === EMAIL);
    if (existing) {
      await admin.from("contact_tickets").delete().eq("userId", existing.id);
      await admin.from("users").delete().eq("id", existing.id);
      await admin.auth.admin.deleteUser(existing.id);
    }
  }

  async function signIn(): Promise<SupabaseClient> {
    const signer = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await signer.auth.signInWithPassword({
      email: EMAIL,
      password: PASSWORD,
    });
    if (error || !data.session) throw new Error(`Sign in failed: ${error?.message}`);
    return createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
    });
  }

  beforeAll(async () => {
    url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "";
    anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] ?? "";
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
    if (!url || !anonKey || !serviceKey) return;

    admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await cleanup();

    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`user: ${error?.message}`);
    userId = data.user.id;
    const now = new Date().toISOString();
    const { error: rowError } = await admin.from("users").insert({
      id: userId,
      email: EMAIL,
      displayName: "RLS notes de ticket",
      updatedAt: now,
    });
    if (rowError) throw new Error(`users row: ${rowError.message}`);

    // The requester's own ticket, so a policy that followed the ticket (as
    // ticket_messages does) would hand them the note: that is the leak this
    // file is about.
    const { error: ticketError } = await admin.from("contact_tickets").insert({
      id: ticketId,
      userId,
      email: EMAIL,
      subject: "Appel d'une décision de bannissement",
      theme: "BAN_APPEAL",
      message: "Je conteste ce bannissement.",
      status: "OPEN",
      updatedAt: now,
    });
    if (ticketError) throw new Error(`ticket: ${ticketError.message}`);
    const { error: noteError } = await admin.from("ticket_notes").insert({
      id: noteId,
      ticketId,
      body: NOTE_BODY,
    });
    if (noteError) throw new Error(`note: ${noteError.message}`);

    configured = true;
  });

  afterAll(async () => {
    if (admin) await cleanup();
  });

  it("keeps the team's note on a ticket from the person who opened it", async () => {
    if (!configured) return;
    const client = await signIn();
    const { data, error } = await client
      .from("ticket_notes")
      .select("id,body")
      .eq("ticketId", ticketId);
    // Refused outright (no privilege) or filtered to nothing: never the note.
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("gives the anonymous role nothing either", async () => {
    if (!configured) return;
    const anon = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await anon.from("ticket_notes").select("id").eq("id", noteId);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("refuses a note written from a signed-in client", async () => {
    if (!configured) return;
    const client = await signIn();
    const forged = randomUUID();
    const { error } = await client
      .from("ticket_notes")
      .insert({ id: forged, ticketId, authorId: userId, body: "Note forgée." });
    expect(error).not.toBeNull();
    const { data } = await admin.from("ticket_notes").select("id").eq("id", forged);
    expect(data ?? []).toEqual([]);
  });

  it("keeps the assignee out of reach, with the rest of the ticket's row", async () => {
    if (!configured) return;
    const client = await signIn();
    const { data, error } = await client
      .from("contact_tickets")
      .select("id,assigneeId")
      .eq("id", ticketId);
    expect(error !== null || (data ?? []).length === 0).toBe(true);
  });

  it("goes with its ticket", async () => {
    if (!configured) return;
    const doomed = randomUUID();
    const now = new Date().toISOString();
    const { error: ticketError } = await admin.from("contact_tickets").insert({
      id: doomed,
      userId,
      email: EMAIL,
      subject: "Éphémère",
      theme: "OTHER",
      message: "Sera effacé.",
      status: "OPEN",
      updatedAt: now,
    });
    expect(ticketError).toBeNull();
    const { error: noteError } = await admin
      .from("ticket_notes")
      .insert({ id: randomUUID(), ticketId: doomed, body: "Note." });
    expect(noteError).toBeNull();
    // The note is there before the ticket goes, or the empty read below would
    // prove nothing about the cascade.
    const before = await admin
      .from("ticket_notes")
      .select("id", { count: "exact", head: true })
      .eq("ticketId", doomed);
    expect(before.error).toBeNull();
    expect(before.count).toBe(1);

    const { error: deleteError } = await admin.from("contact_tickets").delete().eq("id", doomed);
    expect(deleteError).toBeNull();
    const { data, error } = await admin.from("ticket_notes").select("id").eq("ticketId", doomed);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
});
