/**
 * Email system barrel — re-exports the modular Resend email layer.
 *
 * Layout/branding:   lib/email/layout.ts
 * Send wrapper:      lib/email/send.ts
 * Recipient rules:   lib/email/recipients.ts
 * Dispatch glue:     lib/email/dispatch.ts
 * Templates:         lib/email/templates/*
 *
 * SECURITY: server-only — reads RESEND_API_KEY from env. Never import
 * this module (or anything under lib/email/) from client code.
 */

export { isEmailConfigured, sendEmail } from "@/lib/email/send";
export type { SendEmailParams, SendEmailResult } from "@/lib/email/send";

export {
  getEmailAlertRecipients,
  getSosAlertRecipients,
  selectDonorAlertRecipientsFromDonors,
  selectSosAlertRecipientsFromDonors,
  isRangpurCoreRequest,
  MAX_EMAIL_RECIPIENTS,
  MAX_SOS_EMAIL_RECIPIENTS,
} from "@/lib/email/recipients";
export type {
  DonorAlertRecipient,
  EmailDonorRow,
} from "@/lib/email/recipients";

export { dispatchBloodRequestEmails } from "@/lib/email/dispatch";
export type { DispatchOptions } from "@/lib/email/dispatch";

export { sendApplicationApprovedEmail } from "@/lib/email/templates/application-status";
export { sendDonorApplicationRejectedEmail } from "@/lib/email/templates/application-status";
export type {
  DonorApplicationRejectedEmailParams,
  ApplicationApprovedEmailParams,
} from "@/lib/email/templates/application-status";

export { sendBloodRequestAlertEmail } from "@/lib/email/templates/blood-request-alert";
export { sendRequestConfirmedEmail } from "@/lib/email/templates/request-confirmed";
export { sendPasswordResetEmail } from "@/lib/email/templates/forgot-password";
export { sendPasswordResetSuccessEmail } from "@/lib/email/templates/password-reset-success";
export { sendWelcomeEmail } from "@/lib/email/templates/welcome";
