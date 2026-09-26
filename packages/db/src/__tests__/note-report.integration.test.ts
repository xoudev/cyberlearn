/**
 * Reports on shared notes, against the real database.
 *
 * Only a recipient can report, and the note leaves their list in the same
 * transaction; one report per reporter and note; taking a note off every share
 * leaves it to its author; an erased reporter's report stays, unnamed.
 *
 * Skips gracefully when DATABASE_URL is absent, like the other integration
 * specs. Rows are namespaced by a run suffix and removed in afterAll.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../prisma.js";
import { noteReportRepository } from "../repositories/note-report.repository.js";

const suffix = randomUUID().slice(0, 8);
const author = randomUUID();
const reader = randomUUID();
const bystander = randomUUID();
const outsider = randomUUID();
let lessonId = "";
let noteId = "";
let configured = false;

describe("noteReportRepository (integration, real DB)", () => {
  beforeAll(async () => {
    if (!process.env["DATABASE_URL"]) return;
    await prisma.user.createMany({
      data: [
        { id: author, email: `nr-a-${suffix}@t.internal`, displayName: "Auteur" },
        {
          id: reader,
          email: `nr-r-${suffix}@t.internal`,
          displayName: "Lecteur",
          username: `nrr${suffix}`,
        },
        { id: bystander, email: `nr-b-${suffix}@t.internal`, displayName: "Autre" },
        { id: outsider, email: `nr-o-${suffix}@t.internal`, displayName: "Dehors" },
      ],
    });
    const lesson = await prisma.lesson.create({
      data: {
        refCode: `NR-LSN-${suffix}-V01`,
        slug: `nr-lesson-${suffix}`,
        title: "Chiffrement",
        description: "Pour le test.",
        category: "CYBERSEC",
        difficulty: "BEGINNER",
        estimatedMinutes: 5,
        xpReward: 10,
        contentMdx: "# Contenu",
        status: "PUBLISHED",
      },
      select: { id: true },
    });
    lessonId = lesson.id;
    const note = await prisma.note.create({
      data: { userId: author, lessonId, content: "Texte signalé", wordCount: 2 },
      select: { id: true },
    });
    noteId = note.id;
    await prisma.noteShare.createMany({
      data: [
        { noteId, sharedWithId: reader },
        { noteId, sharedWithId: bystander },
      ],
    });
    configured = true;
  });

  afterAll(async () => {
    if (!configured) return;
    await prisma.noteReport.deleteMany({ where: { noteId } });
    await prisma.note.deleteMany({ where: { id: noteId } });
    await prisma.lesson.deleteMany({ where: { id: lessonId } });
    await prisma.user.deleteMany({ where: { id: { in: [author, reader, bystander, outsider] } } });
  });

  it("refuses somebody the note was never shared with, and writes nothing", async () => {
    if (!configured) return;
    expect(await noteReportRepository.report(outsider, noteId, "HATE", null)).toBe(false);
    expect(await prisma.noteReport.count({ where: { noteId } })).toBe(0);
  });

  it("records a recipient's report and takes the note out of their list only", async () => {
    if (!configured) return;
    expect(await noteReportRepository.report(reader, noteId, "HATE", "Insultes.")).toBe(true);
    const shares = await prisma.noteShare.findMany({
      where: { noteId },
      select: { sharedWithId: true },
    });
    expect(shares.map((s) => s.sharedWithId)).toEqual([bystander]);
    const [report] = await prisma.noteReport.findMany({ where: { noteId } });
    expect(report).toMatchObject({ reporterId: reader, reason: "HATE", status: "OPEN" });
  });

  it("lists the note for the console with its author, its report and who still holds it", async () => {
    if (!configured) return;
    const group = (await noteReportRepository.openByNote()).find((g) => g.noteId === noteId);
    expect(group).toMatchObject({
      content: "Texte signalé",
      lessonTitle: "Chiffrement",
      authorDisplayName: "Auteur",
      shareCount: 1,
    });
    expect(group?.reports).toHaveLength(1);
    expect(group?.reports[0]).toMatchObject({ reason: "HATE", reporterUsername: `nrr${suffix}` });
  });

  it("takes the note off every share when the console says so, and leaves it to its author", async () => {
    if (!configured) return;
    expect(await noteReportRepository.resolveNote(noteId, "UNSHARED")).toEqual({
      reports: 1,
      sharesRemoved: 1,
    });
    expect(await prisma.noteShare.count({ where: { noteId } })).toBe(0);
    expect(await prisma.note.count({ where: { id: noteId } })).toBe(1);
    const [report] = await prisma.noteReport.findMany({ where: { noteId } });
    expect(report?.status).toBe("UNSHARED");
    expect(report?.resolvedAt).not.toBeNull();
  });

  it("keeps the report, unnamed, when the reporter's account is erased", async () => {
    if (!configured) return;
    await prisma.user.delete({ where: { id: reader } });
    const [report] = await prisma.noteReport.findMany({ where: { noteId } });
    expect(report?.reporterId).toBeNull();
  });
});
