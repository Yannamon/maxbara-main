import assert from "node:assert/strict";
import { test } from "node:test";
import { validDatabaseUrl } from "../src/config/database.ts";

test("rejects API URLs, missing values and incomplete database URLs", () => {
  for (const value of [undefined, "", "invalid", "https://example.supabase.co", "postgresql://localhost", "postgresql://localhost/postgres"]) {
    assert.equal(validDatabaseUrl(value), false);
  }
});

test("accepts Postgres direct and pooler connection strings", () => {
  assert.equal(validDatabaseUrl("postgresql://postgres:example@db.example.supabase.co:5432/postgres"), true);
  assert.equal(validDatabaseUrl("postgres://postgres.example:example@aws-0-example.pooler.supabase.com:5432/postgres?sslmode=require"), true);
});
