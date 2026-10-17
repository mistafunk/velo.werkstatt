<script>
	import { pb } from '#lib/pb.svelte.js';
	import { t } from '#lib/i18n/index.svelte.js';

	/** @typedef {import('./pb.svelte.js').Rule} Rule */

	/**
	 * Admin only: the regular opening hours, folded into one summary line.
	 * @type {{ rules: Rule[], onchange: () => void }}
	 */
	let { rules, onchange } = $props();

	let error = $state('');
	let message = $state('');
	let newRule = $state({ weekday: 1, start: '17:00', end: '20:00', valid_from: '', valid_to: '' });

	const weekdays = [1, 2, 3, 4, 5, 6, 7];
	const day = (/** @type {string} */ value) => (value ? value.slice(0, 10) : '');
	const short = (/** @type {number} */ d) => t(/** @type {any} */ (`weekday.${d}`)).slice(0, 2);
	const hour = (/** @type {string} */ time) => time.replace(/:00$/, '');
	const summary = $derived(rules.map((r) => `${short(r.weekday)} ${hour(r.start)}–${hour(r.end)}`).join(' · '));

	/** @param {unknown} err */
	function fail(err) {
		const e = /** @type {any} */ (err);
		const details = Object.entries(e.response?.data ?? {}).map(([k, v]) => `${k}: ${/** @type {any} */ (v).message}`).join(', ');
		error = t('common.error', { message: details || e.message });
	}

	/**
	 * Run an action, then let the page reload. A string the action returns is shown.
	 * @param {() => Promise<unknown>} action
	 */
	async function run(action) {
		error = '';
		message = '';
		try {
			const result = await action();
			message = typeof result === 'string' ? result : '';
			onchange();
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

	function generate() {
		run(async () => {
			const res = await pb.send('/api/velo/generate-sessions', { method: 'POST' });
			return t('hours.generated', { n: res.created });
		});
	}
</script>

<details class="card">
	<summary><strong>{t('hours.rules')}</strong> <span class="muted">{summary}</span></summary>
	{#if error}<p class="error">{error}</p>{/if}
	<div class="table">
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
	{#if message}<p class="ok">{message}</p>{/if}
</details>

<style>
	details { margin-bottom: 12px; }
	summary { cursor: pointer; display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; }
	.table { display: grid; gap: 12px; }
	.row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; align-items: end; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
	.row > .field:first-child, .row > button { grid-column: 1 / -1; }
	.field { margin: 0; font-weight: 400; }
	.field span { display: block; font-size: 0.85rem; color: var(--muted); }
</style>
