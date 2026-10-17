<script>
	import { t } from '#lib/i18n/index.svelte.js';
	import AnswerButtons from '#lib/AnswerButtons.svelte';

	/**
	 * The logged in volunteer's own answer for one session: a clear status
	 * line ("You're coming") plus the buttons to change it.
	 * @type {{ value: 'yes' | 'no' | undefined, onchange: (answer: 'yes' | 'no') => void }}
	 */
	let { value, onchange } = $props();
	const state = $derived(value ?? 'none');
</script>

<div class="me me-{state}">
	<span class="status"><span class="icon" aria-hidden="true">{state === 'yes' ? '✓' : state === 'no' ? '✕' : '?'}</span>{t(`me.${state}`)}</span>
	<AnswerButtons {value} {onchange} />
</div>

<style>
	.me { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;
		margin-top: 8px; padding: 8px 10px; border-radius: 10px; border: 2px solid var(--border); }
	.status { display: flex; align-items: center; gap: 8px; font-weight: 600; }
	.icon { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
		color: white; font-size: 0.85rem; background: var(--grey); }
	.me-yes { border-color: var(--green); background: color-mix(in srgb, var(--green) 10%, transparent); }
	.me-yes .icon { background: var(--green); }
	.me-no .status { color: var(--muted); }
	.me-none { border-style: dashed; border-color: var(--amber); }
	.me-none .icon { background: var(--amber); }
</style>
