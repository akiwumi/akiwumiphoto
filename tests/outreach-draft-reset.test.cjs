const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('campaign reset clears the persisted recipient draft from selection and final preview', () => {
  const audience = fs.readFileSync(path.join(root, 'app/admin/outreach/campaigns/new/CampaignAudience.tsx'), 'utf8');
  const finalPreview = fs.readFileSync(path.join(root, 'app/admin/outreach/campaigns/new/final/FinalPreview.tsx'), 'utf8');

  assert.match(audience, /function clearRecipients\(\)[\s\S]*?removeItem\(OUTREACH_DRAFT_STORAGE_KEY\)[\s\S]*?setSelectedIds\(\[\]\)/);
  assert.match(finalPreview, /function resetCampaign\(\)[\s\S]*?removeItem\(OUTREACH_DRAFT_STORAGE_KEY\)[\s\S]*?window\.location\.assign\('\/admin\/outreach\/campaigns\/new'\)/);
  assert.match(finalPreview, />Reset campaign</);
});
