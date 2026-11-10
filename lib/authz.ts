/** Admin identity is an email allow-list held in server environment variables.
 * Password verification is handled by Supabase Auth; never hardcode passwords.
 */
export function isAdminEmail(email?: string | null) {
  const configured = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configured && email && email.trim().toLowerCase() === configured);
}
