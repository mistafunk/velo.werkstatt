<script>
	import { t } from '#lib/i18n/index.svelte.js';

	/**
	 * Compact badge with the logged in volunteer's own answer ("Ich ✓").
	 * Tapping it switches between coming and not coming.
	 * @type {{ value: 'yes' | 'no' | undefined, onchange: (answer: 'yes' | 'no') => void }}
	 */
	let { value, onchange } = $props();
	const state = $derived(value ?? 'none');
</script>

<button
	class="me me-{state}"
	aria-pressed={value === 'yes'}
	title={t(`me.${state}`)}
	onclick={() => onchange(value === 'yes' ? 'no' : 'yes')}
>
	{t('me.badge')} {state === 'yes' ? '✓' : state === 'no' ? '✕' : '?'}
</button>

<style>
	.me { min-height: 0; padding: 2px 10px; border-radius: 999px; font-weight: 600; font-size: 0.85rem;
		border: 2px solid var(--border); white-space: nowrap; }
	.me-yes { background: var(--green); border-color: var(--green); color: white; }
	.me-no { background: var(--grey); border-color: var(--grey); color: white; }
	.me-none { border-style: dashed; border-color: var(--amber); color: var(--amber); }
</style>
