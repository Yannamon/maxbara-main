import type { Locale, Query } from "../site/answers";

export const statuses = ["draft", "submitted", "delivered"] as const;
export type CaseStatus = (typeof statuses)[number];
export const deadlineFilters = ["review", "delivery", "overdue"] as const;
export const referencePattern = /^MB-[A-Z0-9-]{1,30}$/;
export const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export const reviewHours = 48;
export const deliveryDays = 21;
export const pageSize = 25;

export function readFilters(query: Query) {
  return {
    status: statuses.find((value) => value === query.status) ?? "",
    deadline: deadlineFilters.find((value) => value === query.deadline) ?? "",
    search: typeof query.search === "string" ? query.search.trim().slice(0, 100) : "",
    page: typeof query.page === "string" && /^[1-9]\d{0,5}$/.test(query.page) ? Number(query.page) : 1,
  };
}

export type Filters = ReturnType<typeof readFilters>;

export function adminPath(locale: Locale, reference?: string) {
  const root = locale === "fr" ? "/admin" : "/en/admin";
  return reference ? `${root}/${encodeURIComponent(reference)}` : root;
}

export function listPath(locale: Locale, filters: Filters) {
  const query = new URLSearchParams();
  if (filters.status) query.set("status", filters.status);
  if (filters.deadline) query.set("deadline", filters.deadline);
  if (filters.search) query.set("search", filters.search);
  if (filters.page > 1) query.set("page", String(filters.page));
  return `${adminPath(locale)}${query.size ? `?${query}` : ""}`;
}

export function validExpectedDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function deadlineDisplay(deadline: Date | null, now: Date) {
  if (!deadline) return "inactive";
  return deadline <= now ? "overdue" : "open";
}

export function canPreview(contentType: string | null): contentType is "application/pdf" | "image/jpeg" | "image/png" | "image/webp" {
  return contentType === "application/pdf" || contentType === "image/jpeg"
    || contentType === "image/png" || contentType === "image/webp";
}
