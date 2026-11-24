import assert from "node:assert/strict";
import { test } from "node:test";
import { canPreview, deadlineDisplay, listPath, readFilters, validExpectedDate } from "../src/admin/model.ts";

test("filters accept known options and preserve search and pagination when switching language", () => {
  assert.deepEqual(readFilters({ search: " parc ", status: "draft", deadline: "invalid", page: "-1" }),
    { search: "parc", status: "draft", deadline: "", page: 1 });
  assert.equal(listPath("en", readFilters({ search: "l’été", status: "submitted", deadline: "overdue", page: "2" })),
    "/en/admin?status=submitted&deadline=overdue&search=l%E2%80%99%C3%A9t%C3%A9&page=2");
});

test("deadline is overdue at its exact boundary and inactive without a date", () => {
  const now = new Date("2026-11-19T10:00:00Z");
  assert.equal(deadlineDisplay(null, now), "inactive");
  assert.equal(deadlineDisplay(now, now), "overdue");
  assert.equal(deadlineDisplay(new Date(now.valueOf() + 1), now), "open");
});

test("client dates must be real dates and document previews use known types", () => {
  assert.equal(validExpectedDate("2026-02-31"), false);
  assert.equal(validExpectedDate("2028-02-29"), true);
  assert.equal(canPreview("text/html"), false);
  assert.equal(canPreview("application/pdf"), true);
  assert.equal(canPreview("image/heic"), false);
});
