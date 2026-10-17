<script>
	import { t } from '#lib/i18n/index.svelte.js';

	/** @type {{ value: string | undefined, onchange: (answer: 'yes' | 'maybe' | 'no') => void, disabled?: boolean }} */
	let { value, onchange, disabled = false } = $props();
	const options = /** @type {const} */ (['yes', 'maybe', 'no']);
</script>

<div class="segmented" role="group">
	{#each options as option (option)}
		<button
			class={value === option ? `sel-${option}` : ''}
			aria-pressed={value === option}
			{disabled}
			onclick={() => onchange(option)}>{t(`answer.${option}`)}</button
		>
	{/each}
</div>
