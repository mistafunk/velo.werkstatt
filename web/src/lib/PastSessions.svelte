<script>
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { t, formatDate } from '#lib/i18n/index.svelte.js';
	import { loadPast } from '#lib/schedule.js';

	/** @type {Awaited<ReturnType<typeof loadPast>>['rows']} */
	let rows = $state([]);
	let page = $state(0);
	let more = $state(false);
	let loading = $state(true);
	let error = $state('');

	async function next() {
		loading = true;
		try {
			const result = await loadPast(page + 1);
			rows.push(...result.rows);
			more = result.more;
			page += 1;
		} catch (err) {
			error = t('common.error', { message: /** @type {Error} */ (err).message });
		} finally {
			loading = false;
		}
	}

	onMount(next);
</script>

<h2>{t('schedule.past')}</h2>
{#if error}<p class="error">{error}</p>{/if}
{#if !loading && rows.length === 0}<p class="muted">{t('schedule.noPast')}</p>{/if}
<ul class="past">
	{#each rows as row (row.session.id)}
		<li class="card">
			<a href={resolve('/session/[id]', { id: row.session.id })} class="date">
				{formatDate(row.session.date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
				<span class="muted">{row.session.start}–{row.session.end}</span>
			</a>
			<p class="stats">{t('schedule.pastStats', { visitors: row.visitors, material: Number.isInteger(row.material) ? row.material : row.material.toFixed(2) })}</p>
		</li>
	{/each}
</ul>
{#if more}
	<p class="more"><button onclick={next} disabled={loading}>{t('schedule.older')}</button></p>
{/if}

<style>
	h2 { margin-top: 28px; }
	.past { list-style: none; padding: 0; display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
	.past .card { padding-top: 10px; padding-bottom: 10px; }
	.date { font-weight: 600; color: var(--text); text-decoration: none; }
	.date .muted { white-space: nowrap; }
	.stats { margin: 4px 0 0; color: var(--muted); }
	.more { text-align: center; }
</style>
