/**
 * @typedef {import('./pb.svelte.js').Session} Session
 * @typedef {import('./pb.svelte.js').Answer} Answer
 * @typedef {import('./pb.svelte.js').Volunteer} Volunteer
 */
import { pb, todayIso } from './pb.svelte.js';

/**
 * Upsert a volunteer's answer for a session.
 * @param {import('./pb.svelte.js').Answer[]} answers all known answers (updated in place)
 * @param {string} sessionId
 * @param {string} volunteerId
 * @param {'yes' | 'no'} answer
 */
export async function saveAnswer(answers, sessionId, volunteerId, answer) {
	const existing = answers.find((a) => a.session === sessionId && a.volunteer === volunteerId);
	if (existing) {
		const rec = await pb.collection('availability').update(existing.id, { answer });
		existing.answer = rec.answer;
	} else {
		const rec = await pb.collection('availability').create({ session: sessionId, volunteer: volunteerId, answer });
		answers.push(/** @type {any} */ (rec));
	}
}

/** Load sessions from today on, with all answers and all volunteers. */
export async function loadSchedule(weeks = 8) {
	const from = todayIso();
	const to = new Date(Date.now() + weeks * 7 * 86400000).toISOString().slice(0, 10);
	const [sessions, answers, volunteers] = await Promise.all([
		pb.collection('sessions').getFullList({ filter: pb.filter('date >= {:from} && date <= {:to}', { from, to }), sort: 'date' }),
		pb.collection('availability').getFullList({ filter: pb.filter('session.date >= {:from}', { from }) }),
		pb.collection('users').getFullList({ sort: 'name' })
	]);
	/** @type {any} */
	const result = { sessions, answers, volunteers };
	return /** @type {{ sessions: Session[], answers: Answer[], volunteers: Volunteer[] }} */ (result);
}
