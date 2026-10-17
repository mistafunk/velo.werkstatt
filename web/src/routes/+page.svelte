<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { pb, session } from '#lib/pb.svelte.js';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';
	import { staffing, NEEDS_PEOPLE } from '#lib/staffing.js';
	import { loadSchedule, saveAnswer } from '#lib/schedule.js';
	import AnswerButtons from '#lib/AnswerButtons.svelte';
	import StaffingBadge from '#lib/StaffingBadge.svelte';

	/** @type {import('#lib/pb.svelte.js').Evening[]} */
	let evenings = $state([]);
	/** @type {import('#lib/pb.svelte.js').Answer[]} */
	let answers = $state([]);
	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	let loading = $state(true);
	let error = $state('');
	let onlyNeeds = $state(false);

	const byId = $derived(new Map(volunteers.map((v) => [v.id, v])));
	const rows = $derived(
		evenings
			.map((e) => {
				const mine = answers.filter((a) => a.evening === e.id);
				return {
					evening: e,
					s: staffing(e, mine, byId),
					coming: mine.filter((a) => a.answer === 'yes').map((a) => byId.get(a.volunteer)).filter(Boolean),
					myAnswer: mine.find((a) => a.volunteer === session.user?.id)?.answer
				};
			})
			.filter((r) => !onlyNeeds || NEEDS_PEOPLE.has(r.s.level))
	);

	async function load() {
		try {
			({ evenings, answers, volunteers } = await loadSchedule());
		} catch (err) {
			error = t('common.error', { message: /** @type {Error} */ (err).message });
		} finally {
			loading = false;
		}
	}

	/**
	 * @param {string} eveningId
	 * @param {'yes' | 'maybe' | 'no'} answer
	 */
	async function answer(eveningId, answer) {
		if (!session.user) return;
		try {
			await saveAnswer(answers, eveningId, session.user.id, answer);
		} catch (err) {
			error = t('common.error', { message: /** @type {Error} */ (err).message });
		}
	}

	onMount(() => {
		load();
		// Live updates when others answer.
		pb.collection('availability').subscribe('*', () => load());
		return () => pb.collection('availability').unsubscribe('*');
	});
</script>

<h1>{t('schedule.title')}</h1>
<label class="check"><input type="checkbox" bind:checked={onlyNeeds} />{t('schedule.needsPeople')}</label>
{#if error}<p class="error">{error}</p>{/if}
{#if loading}
	<p class="muted">{t('common.loading')}</p>
{:else if rows.length === 0}
	<p class="muted">{t('schedule.empty')}</p>
{/if}

<ul class="evenings">
	{#each rows as row (row.evening.id)}
		<li class="card">
			<div class="top">
				<a href={resolve('/evening/[id]', { id: row.evening.id })} class="date">
					{formatDate(row.evening.date)}
					<span class="muted">{row.evening.start}–{row.evening.end}</span>
				</a>
				<StaffingBadge s={row.s} />
			</div>
			{#if row.evening.status === 'closed'}
				<p class="muted">{t('evening.closedBecause', { reason: row.evening.closed_reason })}</p>
			{:else}
				<p class="names">
					{#if row.coming.length}
						{#each row.coming as v, i (v?.id)}{i ? ', ' : ''}{v?.name}{v?.has_key ? ' 🔑' : ''}{/each}
					{:else}
						<span class="muted">{t('schedule.nobody')}</span>
					{/if}
				</p>
				<AnswerButtons value={row.myAnswer} onchange={(a) => answer(row.evening.id, a)} />
			{/if}
		</li>
	{/each}
</ul>

<style>
	.evenings { list-style: none; padding: 0; display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
	.top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.date { font-weight: 600; color: var(--text); text-decoration: none; }
	.date .muted { white-space: nowrap; }
	.names { margin: 8px 0; min-height: 1.4em; }
</style>
