/** Emails in PLATFORM_ADMIN_EMAILS — unlimited quota and sessions for their workspaces. */
export function getPlatformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getPlatformAdminEmails();
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}
