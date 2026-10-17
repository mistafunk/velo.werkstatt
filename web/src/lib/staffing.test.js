import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staffing } from './staffing.js';

const volunteers = new Map([
	['keyA', { has_key: true }],
	['helperA', { has_key: false }],
	['helperB', { has_key: false }],
	['keyB', { has_key: true }]
]);
const open = { status: 'open' };
/** @param {[string, string][]} pairs */
const answers = (pairs) => pairs.map(([volunteer, answer]) => ({ volunteer, answer }));

test('closed sessions are closed whatever the answers', () => {
	assert.equal(staffing({ status: 'closed' }, answers([['keyA', 'yes']]), volunteers).level, 'closed');
});

test('nobody signed up', () => {
	assert.equal(staffing(open, answers([['keyA', 'no'], ['helperA', 'no']]), volunteers).level, 'empty');
});

test('people without a key are not enough', () => {
	const s = staffing(open, answers([['helperA', 'yes'], ['helperB', 'yes']]), volunteers);
	assert.deepEqual(s, { level: 'nokey', yes: 2, hasKey: false });
});

test('a no from a key holder leaves the session without a key', () => {
	assert.equal(staffing(open, answers([['helperA', 'yes'], ['keyA', 'no']]), volunteers).level, 'nokey');
});

test('levels by number of people with a key holder present', () => {
	assert.equal(staffing(open, answers([['keyA', 'yes']]), volunteers).level, 'one');
	assert.equal(staffing(open, answers([['keyA', 'yes'], ['helperA', 'yes']]), volunteers).level, 'two');
	assert.equal(
		staffing(open, answers([['keyA', 'yes'], ['helperA', 'yes'], ['helperB', 'yes'], ['keyB', 'no']]), volunteers).level,
		'full'
	);
});
