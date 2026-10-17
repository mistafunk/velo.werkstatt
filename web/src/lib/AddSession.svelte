<script>
	import { pb } from '#lib/pb.svelte.js';
	import { t } from '#lib/i18n/index.svelte.js';

	/**
	 * Admin only: add a single session, e.g. a special Saturday. Suggests the
	 * next day without a session. On a weekday of the session definition the
	 * times come from the definition; only other days get their own times.
	 * @type {{ rules: import('./pb.svelte.js').Rule[], taken: Set<string>, from: string, onadded: () => void, oncancel: () => void }}
	 */
	let { rules, taken, from, onadded, oncancel } = $props();

	/** @param {string} iso */
	const weekdayOf = (iso) => ((new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7) + 1;
	/** @param {string} iso */
	const ruleFor = (iso) => rules.find((r) => r.weekday === weekdayOf(iso));

	function suggest() {
		const d = new Date(from + 'T12:00:00Z');
		for (let i = 0; i < 120; i++, d.setUTCDate(d.getUTCDate() + 1)) {
			const iso = d.toISOString().slice(0, 10);
			if (!taken.has(iso)) return iso;
		}
		return from;
	}

	let date = $state(suggest());
	const rule = $derived(ruleFor(date));
	// Times for a day the definition does not cover (initial values only).
	const initial = () => rules[0];
	let start = $state(initial()?.start ?? '17:00');
	let end = $state(initial()?.end ?? '20:00');
	let error = $state('');

	/** @param {SubmitEvent} e */
	async function save(e) {
		e.preventDefault();
		if (taken.has(date)) {
			error = t('admin.exists');
			return;
		}
		try {
			const times = rule ? { start: rule.start, end: rule.end } : { start, end };
			await pb.collection('sessions').create({ date, ...times, status: 'open' });
			onadded();
		} catch (err) {
			const e = /** @type {any} */ (err);
			// The date is unique; the list may not show every session that exists.
			error = e.response?.data?.date ? t('admin.exists') : t('common.error', { message: e.message });
		}
	}
</script>

<form class="card" onsubmit={save}>
	<strong>{t('admin.addTitle')}</strong>
	<div class="fields">
		<label>{t('hours.date')}<input type="date" required bind:value={date} /></label>
		{#if !rule}
			<label>{t('hours.start')}<input type="time" required bind:value={start} /></label>
			<label>{t('hours.end')}<input type="time" required bind:value={end} /></label>
		{/if}
	</div>
	{#if rule}<p class="muted">{t('admin.fromDefinition', { start: rule.start, end: rule.end })}</p>{/if}
	{#if error}<p class="error">{error}</p>{/if}
	<p class="buttons">
		<button class="primary">{t('admin.save')}</button>
		<button type="button" onclick={oncancel}>{t('admin.cancel')}</button>
	</p>
</form>

<style>
	form { margin-bottom: 12px; }
	.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
	.fields label:first-child { grid-column: 1 / -1; }
	.fields label { margin: 8px 0 0; font-size: 0.85rem; color: var(--muted); }
	.buttons { display: flex; gap: 8px; margin: 12px 0 0; }
</style>
