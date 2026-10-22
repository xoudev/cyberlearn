// @cyberlearn/db/audit-actions
//
// Every action the console writes to the audit log, in one place.
//
// The names used to be spelled out wherever a row was written: in a
// repository, in a server action, in a route, sometimes twice for one gesture
// (a lifted ban, a ticket's status). The journal's action filter matches them
// exactly, so a typo or a rename in one copy made a gesture disappear from the
// filter that looks for it, without a word. The writers read them from here,
// the repositories' own constants included (ROLE_UPDATE_ACTION and the rest),
// and so does the journal's list of actions.
//
// On a path of its own, apart from the package's index: it needs neither the
// Prisma client nor a repository, so a client component can read it, and a
// test that replaces the whole of "@cyberlearn/db" with a fake still writes
// the real names.
//
// A value is never renamed: rows already written keep the old name, and a
// filter on the new one would no longer find them.

export const AUDIT_ACTION = {
  /** The administrator's own sessions, from « Mon compte ». */
  ownAccount: {
    othersSignedOut: "admin.account.sessions.others_revoked",
    allSignedOut: "admin.account.sessions.all_revoked",
  },
  announcement: {
    send: "announcement.send",
  },
  /** The journal itself: its CSV export carries addresses. */
  audit: {
    export: "admin.audit.export",
  },
  badge: {
    create: "badge.create",
    update: "badge.update",
    activeUpdate: "badge.active.update",
    delete: "badge.delete",
  },
  catalogue: {
    firstArchive: "catalogue.first.archive",
    publish: "catalogue.publish",
  },
  certificate: {
    revoke: "admin.certificate.revoke",
    reinstate: "admin.certificate.reinstate",
  },
  challenge: {
    create: "challenge.create",
    update: "challenge.update",
    activeUpdate: "challenge.active.update",
    delete: "challenge.delete",
    hintCreate: "challenge.hint.create",
    hintUpdate: "challenge.hint.update",
    hintDelete: "challenge.hint.delete",
    sync: "challenge.sync",
  },
  class: {
    establishmentCreate: "class.establishment.create",
    establishmentUpdate: "class.establishment.update",
    establishmentArchive: "class.establishment.archive",
    establishmentUnarchive: "class.establishment.unarchive",
    promotionCreate: "class.promotion.create",
    promotionUpdate: "class.promotion.update",
    promotionArchive: "class.promotion.archive",
    promotionUnarchive: "class.promotion.unarchive",
    create: "class.create",
    update: "class.update",
    archive: "class.archive",
    unarchive: "class.unarchive",
    membersAdd: "class.members.add",
    membersRemove: "class.members.remove",
    invitationRevoke: "class.invitation.revoke",
    teacherAssign: "class.teacher.assign",
    teacherUnassign: "class.teacher.unassign",
  },
  /** What people publish to each other: a forum message, a question, a solution, a resource. */
  content: {
    hide: "moderation.content.hide",
    restore: "moderation.content.restore",
    delete: "moderation.content.delete",
    dismiss: "moderation.report.dismiss",
  },
  lesson: {
    create: "lesson.create",
    /** The console's lesson form, before the studio: rows already written keep it. */
    update: "lesson.update",
    status: "lesson.status",
    statusBulk: "lesson.status.bulk",
    delete: "lesson.delete",
    paths: "lesson.paths",
    prerequisites: "lesson.prerequisites",
    /** The studio's « Publier les changements ». */
    publish: "lesson.publish",
    /** The studio's « Abandonner le brouillon ». */
    draftDiscard: "lesson.draft.discard",
    /** A lesson created from a file: uploaded on the import page, or from the repository. */
    importSuccess: "lesson.import.success",
    /** A file uploaded on the import page, written over the lesson that holds its refCode. */
    importUpdate: "lesson.import.update",
    /** An upload refused at the import page's hourly budget: nothing was written. */
    importRateLimited: "lesson.import.rate_limited",
    /** A file uploaded on the import page that failed its checks: nothing was written. */
    importRejected: "lesson.import.rejected",
    /** A lesson updated from its file in the repository. */
    sync: "lesson.sync",
  },
  /** A person's decision on what the automatic screen took down. */
  moderation: {
    upheld: "moderation.upheld",
    overturned: "moderation.overturned",
  },
  noteReport: {
    unshare: "note.report.unshare",
    dismiss: "note.report.dismiss",
  },
  path: {
    create: "path.create",
    update: "path.update",
    status: "path.status",
    delete: "path.delete",
    sync: "path.sync",
  },
  quiz: {
    upsert: "quiz.upsert",
    questionCreate: "quiz_question.create",
    questionUpdate: "quiz_question.update",
    questionDelete: "quiz_question.delete",
    sync: "quiz.sync",
    reportResolve: "quiz.report.resolve",
  },
  ticket: {
    statusUpdate: "ticket.status.update",
    reply: "ticket.reply",
    assign: "ticket.assign",
    noteAdd: "ticket.note.add",
  },
  tournament: {
    create: "tournament.create",
    update: "tournament.update",
    delete: "tournament.delete",
    end: "tournament.end",
  },
  /** The console's two gestures on a tournament flag. */
  tournamentSolve: {
    disqualify: "tournament.solve.disqualify",
    requalify: "tournament.solve.requalify",
  },
  /** Gestures on an account, from its page in the console. */
  user: {
    /** Read back by userRepository.heldAdminRoleSince: see mfaResetRefusal. */
    roleUpdate: "user.role.update",
    deleted: "admin.user.deleted",
    deletionNoticeFailed: "admin.user.deleted.notice_failed",
    banned: "admin.user.banned",
    banLifted: "admin.user.ban_lifted",
    progressReset: "admin.user.progress.reset",
    mfaReset: "admin.user.mfa_reset",
    passwordResetSent: "admin.user.password_reset_sent",
    confirmationResent: "admin.user.confirmation_resent",
    emailConfirmed: "admin.user.email_confirmed",
    profileUpdate: "admin.user.profile.update",
    profileReset: "admin.user.profile.reset",
    sessionsRevoked: "admin.user.sessions.revoked",
    badgeGrant: "admin.user.badge.grant",
    badgeRevoke: "admin.user.badge.revoke",
    lessonProgressCorrect: "admin.user.lesson_progress.correct",
    placementReset: "admin.user.placement.reset",
    examCooldownWaived: "admin.user.exam_cooldown.waived",
    streakCorrect: "admin.user.streak.correct",
    xpAdjust: "admin.user.xp.adjust",
    /** The account's GDPR export, downloaded from its page: the file carries all of its data. */
    dataExported: "admin.user.data.exported",
  },
} as const;

type Catalogue = typeof AUDIT_ACTION;

/** One of the console's audit actions, as the log stores it. */
export type AuditAction = {
  [Group in keyof Catalogue]: Catalogue[Group][keyof Catalogue[Group]];
}[keyof Catalogue];

const groups: readonly Readonly<Record<string, AuditAction>>[] = Object.values(AUDIT_ACTION);

/** Every one of them, once each and sorted: the journal offers them in its filter. */
export const CONSOLE_AUDIT_ACTIONS: readonly AuditAction[] = [
  ...new Set(groups.flatMap((group) => Object.values(group))),
].sort();
