<script>
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { pb, session } from '#lib/pb.svelte.js';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';
	import { staffing } from '#lib/staffing.js';
	import { saveAnswer } from '#lib/schedule.js';
	import AnswerButtons from '#lib/AnswerButtons.svelte';
	import StaffingBadge from '#lib/StaffingBadge.svelte';

	/** @type {import('#lib/pb.svelte.js').Evening | null} */
	let evening = $state(null);
	/** @type {import('#lib/pb.svelte.js').Answer[]} */
	let answers = $state([]);
	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	let error = $state('');
	let saved = $state(false);
	let reason = $state('');

	const isAdmin = $derived(!!session.user?.is_admin);
	const byId = $derived(new Map(volunteers.map((v) => [v.id, v])));
	const s = $derived(evening ? staffing(evening, answers, byId) : null);
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
				pb.collection('evenings').getOne(id),
				pb.collection('availability').getFullList({ filter: pb.filter('evening = {:id}', { id }) }),
				pb.collection('users').getFullList({ sort: 'name' })
			]);
			evening = /** @type {any} */ (e);
			answers = /** @type {any} */ (a);
			volunteers = /** @type {any} */ (v);
		} catch (err) {
			fail(err);
		}
	}

	/** @param {Record<string, unknown>} changes */
	async function update(changes) {
		if (!evening) return;
		saved = false;
		try {
			evening = /** @type {any} */ (await pb.collection('evenings').update(evening.id, changes));
			saved = true;
		} catch (err) {
			fail(err);
		}
	}

	/** @param {'yes' | 'maybe' | 'no'} a */
	async function answer(a) {
		if (!evening || !session.user) return;
		try {
			await saveAnswer(answers, evening.id, session.user.id, a);
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
{#if evening && s}
	<h1>
		{t('evening.title', { date: formatDate(evening.date, { weekday: 'long', day: 'numeric', month: 'long' }) })}
	</h1>
	<p>{evening.start}–{evening.end} <StaffingBadge {s} /></p>

	{#if evening.status === 'closed'}
		<p>{t('evening.closedBecause', { reason: evening.closed_reason })}</p>
	{:else}
		<div class="card">
			<strong>{t('schedule.myAnswer')}</strong>
			<div><AnswerButtons value={myAnswer} onchange={answer} /></div>
		</div>
	{/if}

	<div class="grid">
		{#each [['yes', 'evening.coming'], ['maybe', 'evening.maybe'], ['no', 'evening.notComing']] as [key, label] (key)}
			<div class="card">
				<strong>{t(/** @type {any} */ (label))}</strong>
				<ul>
					{#each who(key) as v (v.id)}<li>{v.name}{v.has_key ? ' 🔑' : ''}</li>{/each}
				</ul>
			</div>
		{/each}
		<div class="card">
			<strong>{t('evening.noAnswer')}</strong>
			<ul>
				{#each unanswered as v (v.id)}<li>{v.name}{v.has_key ? ' 🔑' : ''}</li>{/each}
			</ul>
		</div>
	</div>

	<div class="card">
		<label for="lead">{t('evening.lead')}</label>
		<select id="lead" value={evening.lead} onchange={(e) => update({ lead: e.currentTarget.value })}>
			<option value="">{t('evening.noLead')}</option>
			{#each who('yes') as v (v.id)}<option value={v.id}>{v.name}</option>{/each}
			{#if evening.lead && !who('yes').some((v) => v.id === evening?.lead)}
				<option value={evening.lead}>{byId.get(evening.lead)?.name}</option>
			{/if}
		</select>
		<label for="notes">{t('evening.notes')}</label>
		<textarea id="notes" rows="3" value={evening.notes} onchange={(e) => update({ notes: e.currentTarget.value })}
		></textarea>
		{#if saved}<p class="ok">{t('evening.saved')}</p>{/if}
	</div>

	{#if isAdmin}
		<div class="card">
			{#if evening.status === 'open'}
				<label for="reason">{t('evening.closedReason')}</label>
				<input id="reason" bind:value={reason} />
				<p><button onclick={() => update({ status: 'closed', closed_reason: reason })}>{t('evening.close')}</button></p>
			{:else}
				<button onclick={() => update({ status: 'open', closed_reason: '' })}>{t('evening.reopen')}</button>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin: 12px 0; }
	.card { margin-bottom: 12px; }
	ul { margin: 8px 0 0; padding-left: 20px; }
</style>
