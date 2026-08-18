/** Turn stored `/uploads/...` paths into URLs that work on live and local. */
export function resolveUploadUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith('/') ? path : `/${path}`;
}
