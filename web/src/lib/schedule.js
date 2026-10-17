/**
 * @typedef {import('./pb.svelte.js').Opening} Opening
 * @typedef {import('./pb.svelte.js').Answer} Answer
 * @typedef {import('./pb.svelte.js').Volunteer} Volunteer
 */
import { pb, todayIso } from './pb.svelte.js';

/**
 * Upsert a volunteer's answer for an opening.
 * @param {import('./pb.svelte.js').Answer[]} answers all known answers (updated in place)
 * @param {string} openingId
 * @param {string} volunteerId
 * @param {'yes' | 'maybe' | 'no'} answer
 */
export async function saveAnswer(answers, openingId, volunteerId, answer) {
	const existing = answers.find((a) => a.opening === openingId && a.volunteer === volunteerId);
	if (existing) {
		const rec = await pb.collection('availability').update(existing.id, { answer });
		existing.answer = rec.answer;
	} else {
		const rec = await pb.collection('availability').create({ opening: openingId, volunteer: volunteerId, answer });
		answers.push(/** @type {any} */ (rec));
	}
}

/** Load openings from today on, with all answers and all volunteers. */
export async function loadSchedule(weeks = 8) {
	const from = todayIso();
	const to = new Date(Date.now() + weeks * 7 * 86400000).toISOString().slice(0, 10);
	const [openings, answers, volunteers] = await Promise.all([
		pb.collection('openings').getFullList({ filter: pb.filter('date >= {:from} && date <= {:to}', { from, to }), sort: 'date' }),
		pb.collection('availability').getFullList({ filter: pb.filter('opening.date >= {:from}', { from }) }),
		pb.collection('users').getFullList({ sort: 'name' })
	]);
	/** @type {any} */
	const result = { openings, answers, volunteers };
	return /** @type {{ openings: Opening[], answers: Answer[], volunteers: Volunteer[] }} */ (result);
}
