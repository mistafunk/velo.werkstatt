<script>
	import { pb } from './pb.svelte.js';

	/**
	 * A volunteer's avatar, or their initials on a colour derived from their id.
	 * @type {{ v: { id: string, name?: string, email?: string, avatar?: string, collectionId?: string }, size?: number }}
	 */
	let { v, size = 32 } = $props();

	const initials = $derived(
		(v.name || v.email || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
	);
	const hue = $derived([...v.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 0));
	const src = $derived(v.avatar ? pb.files.getURL(v, v.avatar, { thumb: size > 96 ? '240x240' : '96x96' }) : '');
</script>

{#if src}
	<img class="avatar" {src} alt="" width={size} height={size} style="width:{size}px;height:{size}px" />
{:else}
	<span class="avatar initials" aria-hidden="true" style="width:{size}px;height:{size}px;font-size:{size * 0.4}px;background:hsl({hue} 45% 45%)">{initials}</span>
{/if}

<style>
	.avatar { display: inline-flex; align-items: center; justify-content: center; flex: none; border-radius: 50%; object-fit: cover; vertical-align: middle; }
	.initials { color: white; font-weight: 600; letter-spacing: 0.02em; }
</style>
