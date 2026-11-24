export function validDatabaseUrl(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  try {
    const url = new URL(value);
    return ["postgres:", "postgresql:"].includes(url.protocol)
      && Boolean(url.hostname && url.username && url.pathname.length > 1);
  } catch {
    return false;
  }
}
