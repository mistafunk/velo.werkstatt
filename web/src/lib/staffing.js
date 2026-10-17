/**
 * Staffing rules of the workshop: at least one volunteer per session, ideally
 * two, best three, and at least one of them must have a workshop key.
 * Answers are Yes or No; there is no Maybe.
 */

/** @typedef {'closed' | 'nokey' | 'empty' | 'one' | 'two' | 'full'} StaffingLevel */

/**
 * @param {{ status: string }} session
 * @param {{ volunteer: string, answer: string }[]} answers answers for this session
 * @param {Map<string, { has_key: boolean }>} volunteers volunteers by id
 * @returns {{ level: StaffingLevel, yes: number, hasKey: boolean }}
 */
export function staffing(session, answers, volunteers) {
	const yesIds = answers.filter((a) => a.answer === 'yes').map((a) => a.volunteer);
	const yes = yesIds.length;
	const hasKey = yesIds.some((id) => volunteers.get(id)?.has_key);
	/** @type {StaffingLevel} */
	let level;
	if (session.status === 'closed') level = 'closed';
	else if (yes === 0) level = 'empty';
	else if (!hasKey) level = 'nokey';
	else if (yes === 1) level = 'one';
	else if (yes === 2) level = 'two';
	else level = 'full';
	return { level, yes, hasKey };
}
