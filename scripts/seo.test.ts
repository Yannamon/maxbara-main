import assert from "node:assert/strict";
import { test } from "node:test";
import { publicPageMetadata, publicSiteOrigin } from "../src/site/seo.ts";
import sitemap from "../src/app/sitemap.ts";
import robots from "../src/app/robots.ts";

test("canonical origins reject local, invalid and credential-bearing URLs", () => {
  for (const value of ["", "invalid", "http://localhost:3000", "https://localhost", "https://127.0.0.1", "https://[::1]", "https://user:password@example.com"]) {
    assert.equal(publicSiteOrigin(value), undefined);
  }
  assert.equal(publicSiteOrigin("https://example.com/path?query=1"), "https://example.com");
});

test("public pages have reciprocal language alternates and private areas stay out of the sitemap", () => {
  const previous = process.env.SITE_URL;
  process.env.SITE_URL = "https://example.com";
  try {
    for (const section of ["home", "checklist", "quote"] as const) {
      const fr = publicPageMetadata("fr", section);
      const en = publicPageMetadata("en", section);
      assert.deepEqual(fr.alternates?.languages, en.alternates?.languages);
      assert.notEqual(fr.alternates?.canonical, en.alternates?.canonical);
      assert.equal(fr.alternates?.languages?.["x-default"], fr.alternates?.canonical);
    }
    const entries = sitemap();
    assert.equal(entries.length, 6);
    assert.equal(entries.some(entry => /dashboard|admin|cases|dossiers|appointments|commencer/.test(entry.url)), false);
    assert.equal(robots().sitemap, "https://example.com/sitemap.xml");
  } finally {
    if (previous === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previous;
  }
});

test("a missing public origin does not publish localhost canonicals or sitemap entries", () => {
  const previousSite = process.env.SITE_URL;
  const previousApp = process.env.APP_URL;
  process.env.SITE_URL = "";
  process.env.APP_URL = "http://localhost:3000";
  try {
    assert.equal(publicPageMetadata("en", "home").alternates, undefined);
    assert.deepEqual(sitemap(), []);
    assert.deepEqual(robots().rules, { userAgent: "*", disallow: "/" });
  } finally {
    if (previousSite === undefined) delete process.env.SITE_URL; else process.env.SITE_URL = previousSite;
    if (previousApp === undefined) delete process.env.APP_URL; else process.env.APP_URL = previousApp;
  }
});
