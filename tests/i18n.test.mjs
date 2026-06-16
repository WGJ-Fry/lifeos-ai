import assert from "node:assert/strict";
import test from "node:test";
import { translations } from "../src/i18n/translations.ts";

test("i18n locales expose the same translation keys", () => {
  const locales = Object.keys(translations);
  assert.deepEqual(locales.sort(), ["en-US", "zh-CN"]);

  const baseKeys = Object.keys(translations["zh-CN"]).sort();
  for (const locale of locales) {
    assert.deepEqual(Object.keys(translations[locale]).sort(), baseKeys, `${locale} translation keys should match zh-CN`);
  }
});

test("i18n translations do not contain empty strings", () => {
  for (const [locale, messages] of Object.entries(translations)) {
    for (const [key, value] of Object.entries(messages)) {
      assert.equal(typeof value, "string", `${locale}.${key} should be a string`);
      assert.ok(value.trim().length > 0, `${locale}.${key} should not be empty`);
    }
  }
});
