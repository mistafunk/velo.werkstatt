<script>
	import { pb, auth } from '#lib/pb.svelte.js';
	import { t } from '#lib/i18n/index.svelte.js';

	/** @typedef {import('./pb.svelte.js').Visit} Visit */

	/** Quick list to record and edit the visits of one session. @type {{ sessionId: string }} */
	let { sessionId } = $props();

	/** @type {Visit[]} */
	let visits = $state([]);
	let error = $state('');
	/** @type {string | null} */
	let openId = $state(null);

	const PAYMENTS = /** @type {const} */ (['cash', 'twint', 'open']);
	/** @param {Visit} v */
	const amount = (v) => (v.entry_fee || 0) + (v.material || 0) + (v.donation || 0);
	/** @param {'cash' | 'twint' | 'open'} p */
	const sum = (p) => visits.filter((v) => v.payment === p).reduce((n, v) => n + amount(v), 0);

	/** @param {unknown} err */
	const fail = (err) => (error = t('common.error', { message: /** @type {Error} */ (err).message }));

	async function load() {
		try {
			visits = /** @type {any} */ (
				await pb.collection('visits').getFullList({ filter: pb.filter('session = {:id}', { id: sessionId }), sort: 'created' })
			);
		} catch (err) {
			fail(err);
		}
	}

	async function add() {
		const arrived = new Date().toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' });
		try {
			const v = /** @type {any} */ (
				await pb.collection('visits').create({ session: sessionId, arrived, entry_fee: 5, payment: 'cash', recorded_by: auth.user?.id })
			);
			visits.push(v);
		} catch (err) {
			fail(err);
		}
	}

	/**
	 * @param {Visit} v
	 * @param {Partial<Visit>} changes
	 */
	async function save(v, changes) {
		Object.assign(v, changes);
		try {
			await pb.collection('visits').update(v.id, changes);
		} catch (err) {
			fail(err);
		}
	}

	/** @param {Visit} v */
	async function remove(v) {
		try {
			await pb.collection('visits').delete(v.id);
			visits = visits.filter((x) => x.id !== v.id);
		} catch (err) {
			fail(err);
		}
	}

	$effect(() => {
		load();
	});
</script>

<section class="card">
	<div class="head">
		<strong>{t('visits.title')}</strong>
		<button class="primary" onclick={add}>{t('visits.add')}</button>
	</div>
	<p class="muted">
		{visits.length
			? t('visits.summary', { n: visits.length, cash: sum('cash'), twint: sum('twint'), open: sum('open') })
			: t('visits.none')}
	</p>
	{#if error}<p class="error">{error}</p>{/if}
	<ol class="visits">
		{#each visits as v, i (v.id)}
			<li class:owes={v.payment === 'open'}>
				<div class="line">
					<span class="no">{i + 1}</span>
					<label class="mini">{t('visits.arrived')}<input type="time" value={v.arrived} onchange={(e) => save(v, { arrived: e.currentTarget.value })} /></label>
					<label class="mini">{t('visits.fee')}<input type="number" min="0" inputmode="decimal" value={v.entry_fee} onchange={(e) => save(v, { entry_fee: +e.currentTarget.value })} /></label>
					<label class="mini">{t('visits.material')}<input type="number" min="0" inputmode="decimal" value={v.material || ''} placeholder="0" onchange={(e) => save(v, { material: +e.currentTarget.value })} /></label>
				</div>
				<div class="line">
					<div class="segmented" role="group">
						{#each PAYMENTS as p (p)}
							<button class={v.payment === p ? `sel-pay-${p}` : ''} aria-pressed={v.payment === p} onclick={() => save(v, { payment: p })}>{t(`pay.${p}`)}</button>
						{/each}
					</div>
					<span class="total">CHF {amount(v)}</span>
					<button class="link" onclick={() => (openId = openId === v.id ? null : v.id)}>{t('visits.more')} {openId === v.id ? '▴' : '▾'}</button>
				</div>
				{#if v.contact || v.label}<p class="muted small">{[v.label, v.contact].filter(Boolean).join(' · ')}</p>{/if}
				{#if openId === v.id}
					<div class="more">
						<label>{t('visits.donation')}<input type="number" min="0" value={v.donation || ''} placeholder="0" onchange={(e) => save(v, { donation: +e.currentTarget.value })} /></label>
						<label>{t('visits.label')}<input value={v.label} onchange={(e) => save(v, { label: e.currentTarget.value })} /></label>
						<label>{t('visits.contact')}<input value={v.contact} onchange={(e) => save(v, { contact: e.currentTarget.value })} /></label>
						<label>{t('visits.notes')}<input value={v.notes} onchange={(e) => save(v, { notes: e.currentTarget.value })} /></label>
						<p><button onclick={() => remove(v)}>{t('visits.delete')}</button></p>
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</section>

<style>
	.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.visits { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
	.visits li { border: 1px solid var(--border); border-radius: 10px; padding: 8px; }
	.visits li.owes { border-color: var(--amber); }
	.line { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }
	.line + .line { margin-top: 8px; align-items: center; }
	.no { font-weight: 700; min-width: 1.5em; align-self: center; }
	.mini { margin: 0; font-size: 0.8rem; font-weight: 600; color: var(--muted); flex: 1 1 70px; }
	.mini input { width: 100%; margin-top: 2px; }
	.total { font-weight: 600; margin-left: auto; }
	.small { font-size: 0.85rem; margin: 6px 0 0; }
	.more label { margin-top: 8px; }
	.segmented button.sel-pay-cash, .segmented button.sel-pay-twint { background: var(--green); color: white; }
	.segmented button.sel-pay-open { background: var(--amber); color: white; }
</style>
