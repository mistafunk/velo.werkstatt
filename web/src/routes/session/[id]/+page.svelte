<script>
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { pb, auth } from '#lib/pb.svelte.js';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';
	import { staffing } from '#lib/staffing.js';
	import { saveAnswer } from '#lib/schedule.js';
	import MeBadge from '#lib/MeBadge.svelte';
	import VisitList from '#lib/VisitList.svelte';
	import StaffingBadge from '#lib/StaffingBadge.svelte';

	/** @type {import('#lib/pb.svelte.js').Session | null} */
	let session = $state(null);
	/** @type {import('#lib/pb.svelte.js').Answer[]} */
	let answers = $state([]);
	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	let error = $state('');
	let saved = $state(false);

	const isAdmin = $derived(!!auth.user?.is_admin);
	const byId = $derived(new Map(volunteers.map((v) => [v.id, v])));
	const s = $derived(session ? staffing(session, answers, byId) : null);
	/** @param {string} answer */
	const who = (answer) =>
		answers.filter((a) => a.answer === answer).map((a) => byId.get(a.volunteer)).filter((v) => v !== undefined);
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

	async function remove() {
		if (!session || !confirm(t('admin.confirmRemove', { date: formatDate(session.date) }))) return;
		await update({ status: 'closed' });
		if (!error) goto(resolve('/'));
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
	<p class="badges">
		{session.start}–{session.end}
		<StaffingBadge {s} />
		{#if session.status !== 'closed'}<MeBadge value={myAnswer} onchange={answer} />{/if}
	</p>

	{#if session.status === 'closed'}
		<p>{session.closed_reason ? t('session.closedBecause', { reason: session.closed_reason }) : t('staffing.closed')}</p>
	{:else}
		<VisitList sessionId={session.id} />
	{/if}

	<section class="card">
		<strong>{t('session.volunteers')}</strong>
		{#if who('yes').length}
			<ul>
				{#each who('yes') as v (v.id)}<li>{v.name}{v.has_key ? ' 🔑' : ''}</li>{/each}
			</ul>
		{:else}
			<p class="muted">{t('schedule.nobody')}</p>
		{/if}
	</section>

	<div class="card">
		<label for="notes">{t('session.notes')}</label>
		<textarea id="notes" rows="3" value={session.notes} onchange={(e) => update({ notes: e.currentTarget.value })}
		></textarea>
		{#if saved}<p class="ok">{t('session.saved')}</p>{/if}
	</div>

	{#if isAdmin}
		{#if session.status === 'closed'}
			<p><button onclick={() => update({ status: 'open', closed_reason: '' })}>{t('admin.restore')}</button></p>
		{:else}
			<p><button class="danger" onclick={remove}>{t('admin.remove')}</button></p>
		{/if}
	{/if}
{/if}

<style>
	.badges { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
	.card { margin-bottom: 12px; }
	ul { margin: 8px 0 0; padding-left: 20px; }
	.danger { color: var(--red); border-color: var(--red); }
</style>
