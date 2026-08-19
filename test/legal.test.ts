import test from "node:test";
import assert from "node:assert/strict";

import { PRIVACY_POLICY, TERMS_OF_SERVICE } from "../src/content/legal.ts";

const flatten = (doc: typeof PRIVACY_POLICY): string =>
  [
    doc.title,
    doc.intro,
    ...doc.sections.flatMap((s) => [s.heading ?? "", ...(s.paragraphs ?? []), ...(s.bullets ?? [])]),
  ].join("\n");

test("privacy policy covers what LinkedIn app review asks for", () => {
  const text = flatten(PRIVACY_POLICY);

  assert.match(PRIVACY_POLICY.title, /Privacy Policy/i);
  assert.match(text, /LinkedIn/i);
  assert.match(text, /token/i);
  assert.match(text, /disconnect/i);
  assert.ok(PRIVACY_POLICY.sections.length >= 3, "expected several policy sections");
});

test("terms state that a human approves every post", () => {
  const text = flatten(TERMS_OF_SERVICE);

  assert.match(TERMS_OF_SERVICE.title, /Terms/i);
  assert.match(text, /LinkedIn/i);
  assert.match(text, /human approval/i);
  assert.match(text, /official LinkedIn API/i);
});
