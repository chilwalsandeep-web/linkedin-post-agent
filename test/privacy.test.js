const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register');

const { privacyPage, termsPage } = require('../src/web/views');

test('privacy and terms pages are available and include the required disclosure text', () => {
  const privacy = privacyPage();
  const terms = termsPage();

  assert.match(privacy, /Privacy Policy/i);
  assert.match(privacy, /LinkedIn/i);
  assert.match(privacy, /data/i);

  assert.match(terms, /Terms/i);
  assert.match(terms, /LinkedIn/i);
  assert.match(terms, /human approval/i);
});
