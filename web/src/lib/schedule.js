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
export async function loadSchedule(weeks = 2) {
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

/**
 * Load one page of past sessions (newest first) with their number of
 * visitors and material revenue. Sessions recorded in the app count their
 * visits; older ones use the totals imported from the spreadsheet.
 * @param {number} page
 * @param {number} perPage
 */
export async function loadPast(page, perPage = 10) {
	const list = await pb.collection('sessions').getList(page, perPage, {
		filter: pb.filter("date < {:today} && status = 'open'", { today: todayIso() }),
		sort: '-date',
		requestKey: 'past-sessions'
	});
	const ids = list.items.map((e) => e.id);
	const visits = ids.length
		? await pb.collection('visits').getFullList({
				filter: ids.map((id) => pb.filter('session = {:id}', { id })).join(' || '),
				fields: 'session,material',
				requestKey: 'past-visits'
			})
		: [];
	const rows = list.items.map((item) => {
		const session = /** @type {Session} */ (/** @type {any} */ (item));
		const own = visits.filter((v) => v.session === session.id);
		const sheet = session.sheet_totals ?? {};
		return own.length
			? { session, visitors: own.length, material: own.reduce((n, v) => n + (v.material || 0), 0) }
			: { session, visitors: sheet.visitors ?? 0, material: sheet.material ?? 0 };
	});
	return { rows, more: list.page < list.totalPages };
}
