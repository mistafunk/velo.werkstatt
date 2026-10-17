/**
 * Staffing rules of the workshop: at least one volunteer per evening, ideally
 * two, best three, and at least one of them must have a workshop key.
 * "Maybe" answers do not count.
 */

/** @typedef {'closed' | 'nokey' | 'empty' | 'one' | 'two' | 'full'} StaffingLevel */

/**
 * @param {{ status: string }} evening
 * @param {{ volunteer: string, answer: string }[]} answers answers for this evening
 * @param {Map<string, { has_key: boolean }>} volunteers volunteers by id
 * @returns {{ level: StaffingLevel, yes: number, maybe: number, hasKey: boolean }}
 */
export function staffing(evening, answers, volunteers) {
	const yesIds = answers.filter((a) => a.answer === 'yes').map((a) => a.volunteer);
	const maybe = answers.filter((a) => a.answer === 'maybe').length;
	const yes = yesIds.length;
	const hasKey = yesIds.some((id) => volunteers.get(id)?.has_key);
	/** @type {StaffingLevel} */
	let level;
	if (evening.status === 'closed') level = 'closed';
	else if (yes === 0) level = 'empty';
	else if (!hasKey) level = 'nokey';
	else if (yes === 1) level = 'one';
	else if (yes === 2) level = 'two';
	else level = 'full';
	return { level, yes, maybe, hasKey };
}

/** Levels at which an evening still needs people. */
export const NEEDS_PEOPLE = new Set(['empty', 'nokey', 'one']);
