export type NavActiveFn = (pathname: string, href: string) => boolean;

/** האם הנתיב הנוכחי תואם לקישור ניווט (כולל תתי־נתיבים, למעט דף הבית) */
export function isNavHrefActive(pathname: string, href: string): boolean {
  if (href === "/projects/go") {
    return pathname === "/projects" || pathname.startsWith("/projects/");
  }
  if (pathname === href) return true;
  if (href === "/") return false;
  return pathname.startsWith(`${href}/`);
}

/** ניווט אזור שטח: «בית» רק ב־/field בלי להדליק בתתי־נתיבים */
export function isFieldNavHrefActive(pathname: string, href: string): boolean {
  if (href === "/field") return pathname === "/field";
  return isNavHrefActive(pathname, href);
}
