<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { pb, auth, todayIso } from '#lib/pb.svelte.js';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';
	import { staffing } from '#lib/staffing.js';
	import { loadSchedule, saveAnswer } from '#lib/schedule.js';
	import MyAnswer from '#lib/MyAnswer.svelte';
	import StaffingBadge from '#lib/StaffingBadge.svelte';
	import RulesEditor from '#lib/RulesEditor.svelte';
	import AddSession from '#lib/AddSession.svelte';
	import PastSessions from '#lib/PastSessions.svelte';

	/** @type {import('#lib/pb.svelte.js').Session[]} */
	let sessions = $state([]);
	/** @type {import('#lib/pb.svelte.js').Answer[]} */
	let answers = $state([]);
	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	/** @type {import('#lib/pb.svelte.js').Rule[]} */
	let rules = $state([]);
	let loading = $state(true);
	let error = $state('');
	let weeks = $state(2);

	const isAdmin = $derived(!!auth.user?.is_admin);
	const byId = $derived(new Map(volunteers.map((v) => [v.id, v])));
	const rows = $derived(
		sessions
			// Removed sessions are only shown to admins, so they can restore them.
			.filter((e) => isAdmin || e.status !== 'closed')
			.map((e) => {
				const mine = answers.filter((a) => a.session === e.id);
				return {
					session: e,
					s: staffing(e, mine, byId),
					coming: mine.filter((a) => a.answer === 'yes').map((a) => byId.get(a.volunteer)).filter(Boolean),
					myAnswer: mine.find((a) => a.volunteer === auth.user?.id)?.answer
				};
			})
	);

	/** @param {unknown} err */
	const fail = (err) => (error = t('common.error', { message: /** @type {Error} */ (err).message }));

	async function load() {
		try {
			({ sessions, answers, volunteers } = await loadSchedule(weeks));
			if (isAdmin) rules = /** @type {any} */ (await pb.collection('opening_rules').getFullList({ sort: 'weekday,start' }));
		} catch (err) {
			fail(err);
		} finally {
			loading = false;
		}
	}

	/**
	 * @param {string} sessionId
	 * @param {'yes' | 'no'} answer
	 */
	async function answer(sessionId, answer) {
		if (!auth.user) return;
		try {
			await saveAnswer(answers, sessionId, auth.user.id, answer);
		} catch (err) {
			fail(err);
		}
	}

	/**
	 * @param {import('#lib/pb.svelte.js').Session} session
	 * @param {Record<string, unknown>} changes
	 */
	async function update(session, changes) {
		try {
			Object.assign(session, await pb.collection('sessions').update(session.id, changes));
		} catch (err) {
			fail(err);
		}
	}

	/** @param {import('#lib/pb.svelte.js').Session} session */
	function remove(session) {
		if (confirm(t('admin.confirmRemove', { date: formatDate(session.date) }))) update(session, { status: 'closed' });
	}

	onMount(() => {
		load();
		// Live updates when others answer.
		pb.collection('availability').subscribe('*', () => load());
		return () => pb.collection('availability').unsubscribe('*');
	});
</script>

<h1>{t('schedule.title')}</h1>
<h2>{t('schedule.upcoming')}</h2>
{#if error}<p class="error">{error}</p>{/if}
{#if loading}
	<p class="muted">{t('common.loading')}</p>
{:else if rows.length === 0}
	<p class="muted">{t('schedule.empty')}</p>
{/if}

<ul class="sessions">
	{#each rows as row (row.session.id)}
		{@const removed = row.session.status === 'closed'}
		<li class="card" class:removed>
			<div class="top">
				<a href={resolve('/session/[id]', { id: row.session.id })} class="date">
					{formatDate(row.session.date)}
					<span class="muted">{row.session.start}–{row.session.end}</span>
				</a>
				<span class="right">
					<StaffingBadge s={row.s} />
					{#if isAdmin && !removed}
						<button class="icon destructive" aria-label={t('admin.remove')} title={t('admin.remove')} onclick={() => remove(row.session)}>✕</button>
					{/if}
				</span>
			</div>
			{#if removed}
				{#if row.session.closed_reason}<p class="muted">{t('session.closedBecause', { reason: row.session.closed_reason })}</p>{/if}
				<p class="buttons"><button onclick={() => update(row.session, { status: 'open', closed_reason: '' })}>{t('admin.restore')}</button></p>
			{:else}
				<p class="names">
					{#if row.coming.length}
						{#each row.coming as v, i (v?.id)}{i ? ', ' : ''}{v?.name}{v?.has_key ? ' 🔑' : ''}{/each}
					{:else}
						<span class="muted">{t('schedule.nobody')}</span>
					{/if}
				</p>
				<MyAnswer value={row.myAnswer} onchange={(a) => answer(row.session.id, a)} />
			{/if}
		</li>
	{/each}
</ul>
{#if !loading}
	<p class="more"><button onclick={() => { weeks += 4; load(); }}>{t('schedule.more')}</button></p>
{/if}

{#if isAdmin}
	<section class="admin">
		<h2>{t('admin.title')}</h2>
		<AddSession {rules} from={todayIso()} taken={new Set(sessions.map((e) => e.date))} onadded={load} />
		<RulesEditor {rules} onchange={load} />
	</section>
{/if}

<PastSessions />

<style>
	.admin { margin-top: 28px; }
	.sessions { list-style: none; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
	.top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.right { display: flex; align-items: center; gap: 6px; }
	.date { font-weight: 600; color: var(--text); text-decoration: none; }
	.date .muted { white-space: nowrap; }
	.names { margin: 8px 0; min-height: 1.4em; }
	.icon { min-height: 32px; padding: 2px 10px; }
	.buttons { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; }
	.removed { opacity: 0.6; }
	.removed .date { text-decoration: line-through; }
	.more { text-align: center; }
</style>
