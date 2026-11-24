export const registrationFields = [
  "name", "email", "contactPhone", "country", "company", "activity", "turnover", "employees",
  "registeredAddress", "shareholders", "managers", "representativeName", "representativeContact", "notes",
] as const;
export type RegistrationDetails = Record<(typeof registrationFields)[number], string>;
export type ApplicationState = { error?: string };

export function registrationDetails(form: FormData): RegistrationDetails | null {
  const details = {} as RegistrationDetails;
  for (const field of registrationFields) {
    const value = form.get(field);
    if (typeof value !== "string" || value.trim().length > 3000) return null;
    details[field] = value.trim();
  }
  if (["name", "email", "contactPhone", "country", "company", "activity", "shareholders", "managers"]
    .some(field => !details[field as keyof RegistrationDetails])) return null;
  if (details.name.length > 120 || details.company.length > 120
    || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)
    || details.email.length > 254 || !/^\+?[\d ()-]{6,35}$/.test(details.contactPhone)
    || !/^\d{1,15}$/.test(details.turnover) || !/^\d{1,6}$/.test(details.employees)) return null;
  if (form.get("address") === "yes" && !details.registeredAddress) return null;
  if (form.get("representative") === "on" && (!details.representativeName || !details.representativeContact)) return null;
  return details;
}
