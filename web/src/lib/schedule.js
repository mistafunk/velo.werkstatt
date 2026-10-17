/**
 * @typedef {import('./pb.svelte.js').Evening} Evening
 * @typedef {import('./pb.svelte.js').Answer} Answer
 * @typedef {import('./pb.svelte.js').Volunteer} Volunteer
 */
import { pb, todayIso } from './pb.svelte.js';

/**
 * Upsert a volunteer's answer for an evening.
 * @param {import('./pb.svelte.js').Answer[]} answers all known answers (updated in place)
 * @param {string} eveningId
 * @param {string} volunteerId
 * @param {'yes' | 'maybe' | 'no'} answer
 */
export async function saveAnswer(answers, eveningId, volunteerId, answer) {
	const existing = answers.find((a) => a.evening === eveningId && a.volunteer === volunteerId);
	if (existing) {
		const rec = await pb.collection('availability').update(existing.id, { answer });
		existing.answer = rec.answer;
	} else {
		const rec = await pb.collection('availability').create({ evening: eveningId, volunteer: volunteerId, answer });
		answers.push(/** @type {any} */ (rec));
	}
}

/** Load evenings from today on, with all answers and all volunteers. */
export async function loadSchedule(weeks = 8) {
	const from = todayIso();
	const to = new Date(Date.now() + weeks * 7 * 86400000).toISOString().slice(0, 10);
	const [evenings, answers, volunteers] = await Promise.all([
		pb.collection('evenings').getFullList({ filter: pb.filter('date >= {:from} && date <= {:to}', { from, to }), sort: 'date' }),
		pb.collection('availability').getFullList({ filter: pb.filter('evening.date >= {:from}', { from }) }),
		pb.collection('users').getFullList({ sort: 'name' })
	]);
	/** @type {any} */
	const result = { evenings, answers, volunteers };
	return /** @type {{ evenings: Evening[], answers: Answer[], volunteers: Volunteer[] }} */ (result);
}
