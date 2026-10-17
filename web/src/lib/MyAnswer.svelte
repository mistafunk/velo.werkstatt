<script>
	import { t } from '#lib/i18n/index.svelte.js';

	/**
	 * The logged in volunteer's own answer for one session as one compact line:
	 * "Meine Teilnahme: ✓ Ja". Tapping the answer switches between Ja and Nein.
	 * @type {{ value: 'yes' | 'no' | undefined, onchange: (answer: 'yes' | 'no') => void }}
	 */
	let { value, onchange } = $props();
	const state = $derived(value ?? 'none');
</script>

<div class="me">
	<span class="label">{t('me.label')}:</span>
	<button
		class="toggle toggle-{state}"
		role="switch"
		aria-checked={value === 'yes'}
		onclick={() => onchange(value === 'yes' ? 'no' : 'yes')}
	>
		<span class="icon" aria-hidden="true">{state === 'yes' ? '✓' : state === 'no' ? '✕' : '?'}</span>{t(`me.${state}`)}
	</button>
</div>

<style>
	.me { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
	.label { font-weight: 600; }
	.toggle { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; padding: 4px 12px 4px 4px;
		border-radius: 999px; border: 2px solid var(--border); font-weight: 600; }
	.icon { display: inline-grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
		color: white; font-size: 0.85rem; background: var(--grey); }
	.toggle-yes { border-color: var(--green); background: color-mix(in srgb, var(--green) 12%, transparent); }
	.toggle-yes .icon { background: var(--green); }
	.toggle-no { color: var(--muted); }
	.toggle-none { border-style: dashed; border-color: var(--amber); }
	.toggle-none .icon { background: var(--amber); }
</style>
