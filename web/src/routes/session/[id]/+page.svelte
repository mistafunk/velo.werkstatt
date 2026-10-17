<script>
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { pb, auth } from '#lib/pb.svelte.js';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';
	import { staffing } from '#lib/staffing.js';
	import { saveAnswer } from '#lib/schedule.js';
	import AnswerButtons from '#lib/AnswerButtons.svelte';
	import StaffingBadge from '#lib/StaffingBadge.svelte';

	/** @type {import('#lib/pb.svelte.js').Session | null} */
	let session = $state(null);
	/** @type {import('#lib/pb.svelte.js').Answer[]} */
	let answers = $state([]);
	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	let error = $state('');
	let saved = $state(false);
	let reason = $state('');

	const isAdmin = $derived(!!auth.user?.is_admin);
	const byId = $derived(new Map(volunteers.map((v) => [v.id, v])));
	const s = $derived(session ? staffing(session, answers, byId) : null);
	/** @param {string} answer */
	const who = (answer) =>
		answers.filter((a) => a.answer === answer).map((a) => byId.get(a.volunteer)).filter((v) => v !== undefined);
	const unanswered = $derived(volunteers.filter((v) => v.active && !answers.some((a) => a.volunteer === v.id)));
	const myAnswer = $derived(answers.find((a) => a.volunteer === auth.user?.id)?.answer);

	/** @param {unknown} err */
	const fail = (err) => (error = t('common.error', { message: /** @type {Error} */ (err).message }));

	async function load() {
		const id = page.params.id ?? '';
		try {
			const [e, a, v] = await Promise.all([
				pb.collection('sessions').getOne(id),
				pb.collection('availability').getFullList({ filter: pb.filter('session = {:id}', { id }) }),
				pb.collection('users').getFullList({ sort: 'name' })
			]);
			session = /** @type {any} */ (e);
			answers = /** @type {any} */ (a);
			volunteers = /** @type {any} */ (v);
		} catch (err) {
			fail(err);
		}
	}

	/** @param {Record<string, unknown>} changes */
	async function update(changes) {
		if (!session) return;
		saved = false;
		try {
			session = /** @type {any} */ (await pb.collection('sessions').update(session.id, changes));
			saved = true;
		} catch (err) {
			fail(err);
		}
	}

	/** @param {'yes' | 'no'} a */
	async function answer(a) {
		if (!session || !auth.user) return;
		try {
			await saveAnswer(answers, session.id, auth.user.id, a);
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
{#if session && s}
	<h1>
		{t('session.title', { date: formatDate(session.date, { weekday: 'long', day: 'numeric', month: 'long' }) })}
	</h1>
	<p>{session.start}–{session.end} <StaffingBadge {s} /></p>

	{#if session.status === 'closed'}
		<p>{t('session.closedBecause', { reason: session.closed_reason })}</p>
	{:else}
		<div class="card">
			<strong>{t('schedule.myAnswer')}</strong>
			<div><AnswerButtons value={myAnswer} onchange={answer} /></div>
		</div>
	{/if}

	<div class="grid">
		{#each [['yes', 'session.coming'], ['no', 'session.notComing']] as [key, label] (key)}
			<div class="card">
				<strong>{t(/** @type {any} */ (label))}</strong>
				<ul>
					{#each who(key) as v (v.id)}<li>{v.name}{v.has_key ? ' 🔑' : ''}</li>{/each}
				</ul>
			</div>
		{/each}
		<div class="card">
			<strong>{t('session.noAnswer')}</strong>
			<ul>
				{#each unanswered as v (v.id)}<li>{v.name}{v.has_key ? ' 🔑' : ''}</li>{/each}
			</ul>
		</div>
	</div>

	<div class="card">
		<label for="lead">{t('session.lead')}</label>
		<select id="lead" value={session.lead} onchange={(e) => update({ lead: e.currentTarget.value })}>
			<option value="">{t('session.noLead')}</option>
			{#each who('yes') as v (v.id)}<option value={v.id}>{v.name}</option>{/each}
			{#if session.lead && !who('yes').some((v) => v.id === session?.lead)}
				<option value={session.lead}>{byId.get(session.lead)?.name}</option>
			{/if}
		</select>
		<label for="notes">{t('session.notes')}</label>
		<textarea id="notes" rows="3" value={session.notes} onchange={(e) => update({ notes: e.currentTarget.value })}
		></textarea>
		{#if saved}<p class="ok">{t('session.saved')}</p>{/if}
	</div>

	{#if isAdmin}
		<div class="card">
			{#if session.status === 'open'}
				<label for="reason">{t('session.closedReason')}</label>
				<input id="reason" bind:value={reason} />
				<p><button onclick={() => update({ status: 'closed', closed_reason: reason })}>{t('session.close')}</button></p>
			{:else}
				<button onclick={() => update({ status: 'open', closed_reason: '' })}>{t('session.reopen')}</button>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); margin: 12px 0; }
	.card { margin-bottom: 12px; }
	ul { margin: 8px 0 0; padding-left: 20px; }
</style>
