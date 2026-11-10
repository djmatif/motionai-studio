/** Admin access is restricted to one verified Supabase Auth email identity. */
const ADMIN_EMAIL = "djmatife@gmail.com";

export function isAdminEmail(email?: string | null) {
  return Boolean(email && email.trim().toLowerCase() === ADMIN_EMAIL);
}
