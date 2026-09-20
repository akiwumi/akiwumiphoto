const { test } = require('node:test'); const assert = require('node:assert/strict'); const { load } = require('./test-loader.cjs');
const domain = load('lib/outreach/domain.ts');
test('normalizes Unicode whitespace and email case', () => assert.equal(domain.normalizeEmail('  ANA@Example.COM\u200B '), 'ana@example.com'));
test('rejects invalid and accepts valid email syntax', () => { assert.equal(domain.isValidEmail('ana@example.com'), true); assert.equal(domain.isValidEmail('bad@'), false); });
test('requires approval and excludes suppressed contacts', () => { const base = { approved_for_outreach: true, contact_status: 'approved', suppressed_at: null }; assert.equal(domain.isEligibleContact(base), true); assert.equal(domain.isEligibleContact({ ...base, approved_for_outreach: false }), false); assert.equal(domain.isEligibleContact({ ...base, suppressed_at: '2026-01-01' }), false); });
test('does not move delivery backwards', () => { assert.equal(domain.canAdvanceDelivery('delivered', 'queued'), false); assert.equal(domain.canAdvanceDelivery('queued', 'submitted'), true); });
test('ignores a late submitted event after delivery', () => { assert.equal(domain.shouldApplyDeliveryEvent('delivered', 'submitted'), false); assert.equal(domain.shouldApplyDeliveryEvent('submitted', 'delivered'), true); });
test('derives the highest recorded delivery status from event history', () => { assert.equal(domain.effectiveDeliveryStatus('submitted', ['delivered', 'submitted']), 'delivered'); });
