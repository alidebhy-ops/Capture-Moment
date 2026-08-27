// Siapa yang sedang memakai perangkat ini. Sebelumnya penulis komentar dipilih
// dari dropdown setiap kali menulis — untuk dua orang itu merepotkan, dan
// mengganti pilihannya juga mengubah komentar mana yang boleh dihapus.
//
// Ini kenyamanan, bukan keamanan: app memakai satu password bersama, jadi
// identitas di sini tidak membuktikan siapa pun.
export const IDENTITY_COOKIE = "capturemoment_identity";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function readIdentityFromCookie(
  cookieValue: string | undefined,
  validIds: string[]
): string | null {
  if (!cookieValue) return null;
  return validIds.includes(cookieValue) ? cookieValue : null;
}

export function persistIdentity(memberId: string): void {
  document.cookie = `${IDENTITY_COOKIE}=${memberId}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function clearIdentity(): void {
  document.cookie = `${IDENTITY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
