export { MagicLinkEmail, getMagicLinkSubject, sendMagicLinkEmail } from "./templates/magic-link";
export type { EmailActionType } from "./templates/magic-link";
export {
  AccountDeletionConfirmEmail,
  sendDeletionConfirmEmail,
} from "./templates/account-deletion-confirm";
export { ClassEnrolledEmail, sendClassEnrolledEmail } from "./templates/class-enrolled";
export { AccountDeletedEmail, sendAccountDeletedEmail } from "./templates/account-deleted";
export { ClassInvitationEmail, sendClassInvitationEmail } from "./templates/class-invitation";
export {
  WorkAssignedEmail,
  sendWorkAssignedEmail,
  type AssignedWorkKind,
} from "./templates/work-assigned";
