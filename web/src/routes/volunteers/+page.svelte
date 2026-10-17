<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { pb, auth } from '#lib/pb.svelte.js';
	import { t } from '#lib/i18n/index.svelte.js';

	/** @type {import('#lib/pb.svelte.js').Volunteer[]} */
	let volunteers = $state([]);
	let error = $state('');

	const isAdmin = $derived(!!auth.user?.is_admin);
	// Volunteers only see active people; admins also see former ones.
	const shown = $derived(isAdmin ? volunteers : volunteers.filter((v) => v.active));
	/** Imported people without an address get a placeholder that is not worth showing. */
	const realEmail = (/** @type {string} */ email) => (email && !email.endsWith('@example.invalid') ? email : '');

	onMount(async () => {
		try {
			volunteers = /** @type {any} */ (await pb.collection('users').getFullList({ sort: '-active,name' }));
		} catch (err) {
			error = t('common.error', { message: /** @type {Error} */ (err).message });
		}
	});

	/** @param {import('#lib/pb.svelte.js').Volunteer} v */
	async function remove(v) {
		if (!confirm(t('volunteers.confirmDelete', { name: v.name || v.email }))) return;
		try {
			await pb.collection('users').delete(v.id);
			volunteers = volunteers.filter((x) => x.id !== v.id);
		} catch (err) {
			error = t('common.error', { message: /** @type {Error} */ (err).message });
		}
	}
</script>

<h1>{t('volunteers.title')}</h1>
{#if isAdmin}
	<p><a class="button" href={resolve('/volunteers/[id]', { id: 'new' })}>+ {t('volunteers.new')}</a></p>
{/if}
{#if error}<p class="error">{error}</p>{/if}
<ul>
	{#each shown as v (v.id)}
		<li class="card" class:inactive={!v.active}>
			<div class="top">
				{#if isAdmin}
					<span>
						<a href={resolve('/volunteers/[id]', { id: v.id })}>{v.name || v.email}</a>
						{#if v.has_key}<span class="badge">🔑 {t('volunteers.key')}</span>{/if}
						{#if v.is_admin}<span class="badge">{t('volunteers.admin')}</span>{/if}
						{#if !v.active}<span class="badge">{t('volunteers.inactive')}</span>{/if}
					</span>
					{#if v.id !== auth.user?.id}
						<button class="icon destructive" aria-label={t('volunteers.delete')} title={t('volunteers.delete')} onclick={() => remove(v)}>✕</button>
					{/if}
				{:else}
					<strong>{v.name}</strong>
				{/if}
			</div>
			{#if v.phone}<div class="muted"><a href="tel:{v.phone}">{v.phone}</a></div>{/if}
			{#if realEmail(v.email)}<div class="muted"><a href="mailto:{v.email}">{v.email}</a></div>{/if}
		</li>
	{/each}
</ul>

<style>
	ul { list-style: none; padding: 0; display: grid; gap: 8px; }
	.top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.inactive { opacity: 0.6; }
	.badge { margin-left: 6px; }
	.icon { min-height: 32px; padding: 2px 10px; }
</style>
