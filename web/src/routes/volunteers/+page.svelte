<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { pb, auth } from '#lib/pb.svelte.js';
	import { t } from '#lib/i18n/index.svelte.js';

	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	let error = $state('');

	onMount(async () => {
		try {
			volunteers = /** @type {any} */ (await pb.collection('users').getFullList({ sort: '-active,name' }));
		} catch (err) {
			error = t('common.error', { message: /** @type {Error} */ (err).message });
		}
	});
</script>

<h1>{t('volunteers.title')}</h1>
{#if auth.user?.is_admin}
	<p><a class="button" href={resolve('/volunteers/[id]', { id: 'new' })}>+ {t('volunteers.new')}</a></p>
{/if}
{#if error}<p class="error">{error}</p>{/if}
<ul>
	{#each volunteers as v (v.id)}
		<li class="card" class:inactive={!v.active}>
			<a href={resolve('/volunteers/[id]', { id: v.id })}>{v.name || v.email}</a>
			{#if v.has_key}<span class="badge">🔑 {t('volunteers.key')}</span>{/if}
			{#if v.is_admin}<span class="badge">{t('volunteers.admin')}</span>{/if}
			{#if !v.active}<span class="badge">{t('volunteers.inactive')}</span>{/if}
			{#if v.phone}<div class="muted"><a href="tel:{v.phone}">{v.phone}</a></div>{/if}
		</li>
	{/each}
</ul>

<style>
	ul { list-style: none; padding: 0; display: grid; gap: 8px; }
	.inactive { opacity: 0.6; }
	.badge { margin-left: 6px; }
</style>
