<script>
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { pb, session } from '#lib/pb.svelte.js';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';
	import { staffing } from '#lib/staffing.js';
	import { saveAnswer } from '#lib/schedule.js';
	import AnswerButtons from '#lib/AnswerButtons.svelte';
	import StaffingBadge from '#lib/StaffingBadge.svelte';

	/** @type {import('#lib/pb.svelte.js').Opening | null} */
	let opening = $state(null);
	/** @type {import('#lib/pb.svelte.js').Answer[]} */
	let answers = $state([]);
	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	let error = $state('');
	let saved = $state(false);
	let reason = $state('');

	const isAdmin = $derived(!!session.user?.is_admin);
	const byId = $derived(new Map(volunteers.map((v) => [v.id, v])));
	const s = $derived(opening ? staffing(opening, answers, byId) : null);
	/** @param {string} answer */
	const who = (answer) =>
		answers.filter((a) => a.answer === answer).map((a) => byId.get(a.volunteer)).filter((v) => v !== undefined);
	const unanswered = $derived(volunteers.filter((v) => v.active && !answers.some((a) => a.volunteer === v.id)));
	const myAnswer = $derived(answers.find((a) => a.volunteer === session.user?.id)?.answer);

	/** @param {unknown} err */
	const fail = (err) => (error = t('common.error', { message: /** @type {Error} */ (err).message }));

	async function load() {
		const id = page.params.id ?? '';
		try {
			const [e, a, v] = await Promise.all([
				pb.collection('openings').getOne(id),
				pb.collection('availability').getFullList({ filter: pb.filter('opening = {:id}', { id }) }),
				pb.collection('users').getFullList({ sort: 'name' })
			]);
			opening = /** @type {any} */ (e);
			answers = /** @type {any} */ (a);
			volunteers = /** @type {any} */ (v);
		} catch (err) {
			fail(err);
		}
	}

	/** @param {Record<string, unknown>} changes */
	async function update(changes) {
		if (!opening) return;
		saved = false;
		try {
			opening = /** @type {any} */ (await pb.collection('openings').update(opening.id, changes));
			saved = true;
		} catch (err) {
			fail(err);
		}
	}

	/** @param {'yes' | 'maybe' | 'no'} a */
	async function answer(a) {
		if (!opening || !session.user) return;
		try {
			await saveAnswer(answers, opening.id, session.user.id, a);
		} catch (err) {
			fail(err);
		}
	}

	$effect(() => {
		load();
	});
</script>

<p><a href={resolve('/')}>← {t('common.back')}</a></p>
{#if error}<p class="error">{error}</p>{/if}
{#if opening && s}
	<h1>
		{t('opening.title', { date: formatDate(opening.date, { weekday: 'long', day: 'numeric', month: 'long' }) })}
	</h1>
	<p>{opening.start}–{opening.end} <StaffingBadge {s} /></p>

	{#if opening.status === 'closed'}
		<p>{t('opening.closedBecause', { reason: opening.closed_reason })}</p>
	{:else}
		<div class="card">
			<strong>{t('schedule.myAnswer')}</strong>
			<div><AnswerButtons value={myAnswer} onchange={answer} /></div>
		</div>
	{/if}

	<div class="grid">
		{#each [['yes', 'opening.coming'], ['maybe', 'opening.maybe'], ['no', 'opening.notComing']] as [key, label] (key)}
			<div class="card">
				<strong>{t(/** @type {any} */ (label))}</strong>
				<ul>
					{#each who(key) as v (v.id)}<li>{v.name}{v.has_key ? ' 🔑' : ''}</li>{/each}
				</ul>
			</div>
		{/each}
		<div class="card">
			<strong>{t('opening.noAnswer')}</strong>
			<ul>
				{#each unanswered as v (v.id)}<li>{v.name}{v.has_key ? ' 🔑' : ''}</li>{/each}
			</ul>
		</div>
	</div>

	<div class="card">
		<label for="lead">{t('opening.lead')}</label>
		<select id="lead" value={opening.lead} onchange={(e) => update({ lead: e.currentTarget.value })}>
			<option value="">{t('opening.noLead')}</option>
			{#each who('yes') as v (v.id)}<option value={v.id}>{v.name}</option>{/each}
			{#if opening.lead && !who('yes').some((v) => v.id === opening?.lead)}
				<option value={opening.lead}>{byId.get(opening.lead)?.name}</option>
			{/if}
		</select>
		<label for="notes">{t('opening.notes')}</label>
		<textarea id="notes" rows="3" value={opening.notes} onchange={(e) => update({ notes: e.currentTarget.value })}
		></textarea>
		{#if saved}<p class="ok">{t('opening.saved')}</p>{/if}
	</div>

	{#if isAdmin}
		<div class="card">
			{#if opening.status === 'open'}
				<label for="reason">{t('opening.closedReason')}</label>
				<input id="reason" bind:value={reason} />
				<p><button onclick={() => update({ status: 'closed', closed_reason: reason })}>{t('opening.close')}</button></p>
			{:else}
				<button onclick={() => update({ status: 'open', closed_reason: '' })}>{t('opening.reopen')}</button>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin: 12px 0; }
	.card { margin-bottom: 12px; }
	ul { margin: 8px 0 0; padding-left: 20px; }
</style>
