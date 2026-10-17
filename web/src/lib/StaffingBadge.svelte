<script>
	import { t } from '#lib/i18n/index.svelte.js';

	/** @type {{ s: ReturnType<typeof import('./staffing.js').staffing> }} */
	let { s } = $props();
</script>

<span class="level level-{s.level}">
	{#if s.level === 'full'}{t('staffing.full', { n: s.yes })}{:else}{t(`staffing.${s.level}`)}{/if}
	{#if s.hasKey && s.level !== 'closed'}🔑{/if}
</span>
