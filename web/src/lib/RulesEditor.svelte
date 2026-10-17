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
	let newRule = $state({ weekday: 1, start: '17:00', end: '20:00' });

	const weekdays = [1, 2, 3, 4, 5, 6, 7];
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
	 * Run an action, then let the page reload.
	 * @param {() => Promise<unknown>} action
	 */
	async function run(action) {
		error = '';
		try {
			await action();
			onchange();
		} catch (err) {
			fail(err);
		}
	}

	/** @param {Rule} rule */
	const saveRule = (rule) =>
		run(() =>
			pb.collection('opening_rules').update(rule.id, {
				weekday: Number(rule.weekday), start: rule.start, end: rule.end
			})
		);

	/** @param {SubmitEvent} e */
	function addRule(e) {
		e.preventDefault();
		run(() =>
			pb.collection('opening_rules').create({
				...newRule, weekday: Number(newRule.weekday)
			})
		);
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
				<button class="destructive" onclick={() => run(() => pb.collection('opening_rules').delete(rule.id))}>{t('hours.delete')}</button>
			</div>
		{/each}
		<form class="row" onsubmit={addRule}>
			<label class="field"><span>{t('hours.weekday')}</span><select bind:value={newRule.weekday}>
				{#each weekdays as d (d)}<option value={d}>{t(/** @type {any} */ (`weekday.${d}`))}</option>{/each}
			</select></label>
			<label class="field"><span>{t('hours.start')}</span><input type="time" required bind:value={newRule.start} /></label>
			<label class="field"><span>{t('hours.end')}</span><input type="time" required bind:value={newRule.end} /></label>
			<button>{t('hours.addRule')}</button>
		</form>
	</div>
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
