<script>
	import { onMount } from 'svelte';
	import { pb, auth, todayIso } from '#lib/pb.svelte.js';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';

	/** @typedef {{ id: string, weekday: number, start: string, end: string, valid_from: string, valid_to: string }} Rule */

	/** @type {Rule[]} */
	let rules = $state([]);
	/** @type {import('#lib/pb.svelte.js').Session[]} */
	let sessions = $state([]);
	/** @type {Record<string, number>} */
	let answerCounts = $state({});
	let error = $state('');
	let message = $state('');
	let newRule = $state({ weekday: 1, start: '17:00', end: '20:00', valid_from: '', valid_to: '' });
	let extra = $state({ date: '', start: '17:00', end: '20:00' });

	const weekdays = [1, 2, 3, 4, 5, 6, 7];
	const day = (/** @type {string} */ value) => (value ? value.slice(0, 10) : '');

	/** @param {unknown} err */
	function fail(err) {
		const e = /** @type {any} */ (err);
		const details = Object.entries(e.response?.data ?? {}).map(([k, v]) => `${k}: ${/** @type {any} */ (v).message}`).join(', ');
		error = t('common.error', { message: details || e.message });
	}

	async function load() {
		try {
			const from = todayIso();
			const [r, e, a] = await Promise.all([
				pb.collection('opening_rules').getFullList({ sort: 'weekday,start' }),
				pb.collection('sessions').getList(1, 40, { filter: pb.filter('date >= {:from}', { from }), sort: 'date' }),
				pb.collection('availability').getFullList({ filter: pb.filter('session.date >= {:from}', { from }), fields: 'session' })
			]);
			rules = /** @type {any} */ (r);
			sessions = /** @type {any} */ (e.items);
			/** @type {Record<string, number>} */
			const counts = {};
			for (const x of a) counts[x.session] = (counts[x.session] ?? 0) + 1;
			answerCounts = counts;
		} catch (err) {
			fail(err);
		}
	}

	/**
	 * Run an action, then reload. A string the action returns is shown.
	 * @param {() => Promise<unknown>} action
	 */
	async function run(action) {
		error = '';
		message = '';
		try {
			const result = await action();
			message = typeof result === 'string' ? result : '';
			await load();
		} catch (err) {
			fail(err);
		}
	}

	/** @param {Rule} rule */
	const saveRule = (rule) =>
		run(() =>
			pb.collection('opening_rules').update(rule.id, {
				weekday: Number(rule.weekday), start: rule.start, end: rule.end,
				valid_from: rule.valid_from || null, valid_to: rule.valid_to || null
			})
		);

	/** @param {SubmitEvent} e */
	function addRule(e) {
		e.preventDefault();
		run(() =>
			pb.collection('opening_rules').create({
				...newRule, weekday: Number(newRule.weekday),
				valid_from: newRule.valid_from || null, valid_to: newRule.valid_to || null
			})
		);
	}

	/** @param {SubmitEvent} e */
	function addSession(e) {
		e.preventDefault();
		run(() => pb.collection('sessions').create({ ...extra, status: 'open' }));
	}

	function generate() {
		run(async () => {
			const res = await pb.send('/api/velo/generate-sessions', { method: 'POST' });
			return t('hours.generated', { n: res.created });
		});
	}

	/** @param {import('#lib/pb.svelte.js').Session} session */
	function deleteSession(session) {
		if (!confirm(t('hours.confirmDelete', { date: formatDate(session.date) }))) return;
		run(() => pb.collection('sessions').delete(session.id));
	}

	/**
	 * @param {import('#lib/pb.svelte.js').Session} session
	 * @param {Record<string, unknown>} changes
	 */
	const updateSession = (session, changes) => run(() => pb.collection('sessions').update(session.id, changes));

	onMount(load);
</script>

<h1>{t('hours.title')}</h1>
{#if !auth.user?.is_admin}
	<p class="muted">{t('volunteer.adminOnly')}</p>
{:else}
	{#if error}<p class="error">{error}</p>{/if}
	{#if message}<p class="ok">{message}</p>{/if}

	<section class="card">
		<h2>{t('hours.rules')}</h2>
		<p class="muted">{t('hours.rulesHelp')}</p>
		<div class="table">
			<div class="row head">
				<span>{t('hours.weekday')}</span><span>{t('hours.start')}</span><span>{t('hours.end')}</span>
				<span>{t('hours.validFrom')}</span><span>{t('hours.validTo')}</span><span></span>
			</div>
			{#each rules as rule (rule.id)}
				<div class="row">
					<label class="field"><span>{t('hours.weekday')}</span><select bind:value={rule.weekday} onchange={() => saveRule(rule)}>
						{#each weekdays as d (d)}<option value={d}>{t(/** @type {any} */ (`weekday.${d}`))}</option>{/each}
					</select></label>
					<label class="field"><span>{t('hours.start')}</span><input type="time" bind:value={rule.start} onchange={() => saveRule(rule)} /></label>
					<label class="field"><span>{t('hours.end')}</span><input type="time" bind:value={rule.end} onchange={() => saveRule(rule)} /></label>
					<label class="field"><span>{t('hours.validFrom')}</span><input type="date" value={day(rule.valid_from)}
						onchange={(e) => { rule.valid_from = e.currentTarget.value; saveRule(rule); }} /></label>
					<label class="field"><span>{t('hours.validTo')}</span><input type="date" value={day(rule.valid_to)}
						onchange={(e) => { rule.valid_to = e.currentTarget.value; saveRule(rule); }} /></label>
					<button onclick={() => run(() => pb.collection('opening_rules').delete(rule.id))}>{t('hours.delete')}</button>
				</div>
			{/each}
			<form class="row" onsubmit={addRule}>
				<label class="field"><span>{t('hours.weekday')}</span><select bind:value={newRule.weekday}>
					{#each weekdays as d (d)}<option value={d}>{t(/** @type {any} */ (`weekday.${d}`))}</option>{/each}
				</select></label>
				<label class="field"><span>{t('hours.start')}</span><input type="time" required bind:value={newRule.start} /></label>
				<label class="field"><span>{t('hours.end')}</span><input type="time" required bind:value={newRule.end} /></label>
				<label class="field"><span>{t('hours.validFrom')}</span><input type="date" bind:value={newRule.valid_from} /></label>
				<label class="field"><span>{t('hours.validTo')}</span><input type="date" bind:value={newRule.valid_to} /></label>
				<button>{t('hours.addRule')}</button>
			</form>
		</div>
		<p><button class="primary" onclick={generate}>{t('hours.generate')}</button></p>
	</section>

	<section class="card">
		<h2>{t('hours.extra')}</h2>
		<form class="inline" onsubmit={addSession}>
			<label>{t('hours.date')}<input type="date" required bind:value={extra.date} /></label>
			<label>{t('hours.start')}<input type="time" required bind:value={extra.start} /></label>
			<label>{t('hours.end')}<input type="time" required bind:value={extra.end} /></label>
			<button>{t('hours.add')}</button>
		</form>
	</section>

	<section class="card">
		<h2>{t('hours.upcoming')}</h2>
		<p class="muted">{t('hours.upcomingHelp')}</p>
		<ul class="sessions">
			{#each sessions as session (session.id)}
				<li class:closed={session.status === 'closed'}>
					<strong>{formatDate(session.date)}</strong>
					<input aria-label={t('hours.start')} type="time" value={session.start}
						onchange={(e) => updateSession(session, { start: e.currentTarget.value })} />
					<input aria-label={t('hours.end')} type="time" value={session.end}
						onchange={(e) => updateSession(session, { end: e.currentTarget.value })} />
					{#if session.status === 'open'}
						<button onclick={() => {
							const reason = prompt(t('session.closedReason'));
							if (reason !== null) updateSession(session, { status: 'closed', closed_reason: reason });
						}}>{t('session.close')}</button>
					{:else}
						<button onclick={() => updateSession(session, { status: 'open', closed_reason: '' })}
							>{t('session.reopen')}</button
						>
						<span class="muted">{session.closed_reason}</span>
					{/if}
					<button onclick={() => deleteSession(session)}>{t('hours.delete')}</button>
					{#if answerCounts[session.id]}<span class="muted">{t('hours.answers', { n: answerCounts[session.id] })}</span>{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	section { margin-bottom: 16px; }
	h2 { font-size: 1.1rem; margin: 0 0 8px; }
	.table { display: grid; gap: 8px; }
	.row { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1.3fr 1.3fr auto; gap: 8px; align-items: end; }
	.row.head { font-weight: 600; font-size: 0.85rem; color: var(--muted); }
	.field { margin: 0; font-weight: 400; }
	.field span { display: none; font-size: 0.85rem; color: var(--muted); }
	.inline { display: flex; flex-wrap: wrap; gap: 8px; align-items: end; }
	.inline label { margin: 0; display: flex; flex-direction: column; gap: 4px; }
	.sessions { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
	.sessions li { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
	.sessions li strong { min-width: 110px; }
	.sessions li input { width: auto; }
	.closed strong { text-decoration: line-through; color: var(--muted); }
	@media (max-width: 700px) {
		.row { grid-template-columns: 1fr 1fr; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
		.row.head { display: none; }
		.field span { display: block; }
		.row > .field:first-child, .row > button { grid-column: 1 / -1; }
	}
</style>
