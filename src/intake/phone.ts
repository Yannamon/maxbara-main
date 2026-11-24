export function ivorianPhone(value: unknown) {
  if (typeof value !== "string" || !/^[+0-9 .()-]+$/.test(value)) return null;
  const compact = value.replace(/[ .()-]/g, "");
  const national = compact.replace(/^(?:[+]|00)?225(?=[0-9]{10}$)/, "");
  return /^[0-9]{10}$/.test(national) ? `+225${national}` : null;
}
