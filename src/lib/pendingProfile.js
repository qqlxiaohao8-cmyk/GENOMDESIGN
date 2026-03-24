/** Builds display name for Supabase `user_metadata` from signup fields. */
export function buildFullName(firstName, lastName) {
  return [firstName, lastName].map((s) => s.trim()).filter(Boolean).join(' ').trim();
}
