<script>
	import { pb, auth } from '#lib/pb.svelte.js';
	import { t } from '#lib/i18n/index.svelte.js';

	/**
	 * @typedef {import('./pb.svelte.js').Visit} Visit
	 * @typedef {import('./pb.svelte.js').Payment} Payment
	 */

	/** Quick list to record and edit the visits of one session. @type {{ sessionId: string }} */
	let { sessionId } = $props();

	/** @type {Visit[]} */
	let visits = $state([]);
	let error = $state('');
	/** The visit shown expanded; all others are collapsed to one line. @type {string | null} */
	let openId = $state(null);

	/** Each part of a visit is paid on its own; a donation is never open. */
	const PARTS = /** @type {const} */ ([
		{ amount: 'entry_fee', payment: 'entry_payment', label: 'visits.fee', methods: ['cash', 'twint', 'open'] },
		{ amount: 'material', payment: 'material_payment', label: 'visits.material', methods: ['cash', 'twint', 'open'] },
		{ amount: 'donation', payment: 'donation_payment', label: 'visits.donation', methods: ['cash', 'twint'] }
	]);
	/** @param {Payment} p */
	const sum = (p) =>
		visits.reduce((n, v) => n + PARTS.reduce((m, part) => m + (v[part.payment] === p ? v[part.amount] || 0 : 0), 0), 0);
	/** @param {Visit} v */
	const owes = (v) => (v.entry_fee > 0 && v.entry_payment === 'open') || (v.material > 0 && v.material_payment === 'open');

	/** @param {unknown} err */
	const fail = (err) => (error = t('common.error', { message: /** @type {Error} */ (err).message }));

	async function load() {
		try {
			visits = /** @type {any} */ (
				await pb.collection('visits').getFullList({ filter: pb.filter('session = {:id}', { id: sessionId }), sort: 'no' })
			);
		} catch (err) {
			fail(err);
		}
	}

	async function add() {
		try {
			const v = /** @type {any} */ (
				await pb.collection('visits').create({
					session: sessionId, entry_fee: 5, entry_payment: 'open', material_payment: 'open', donation_payment: 'cash',
					recorded_by: auth.user?.id
				})
			);
			visits.push(v);
			openId = v.id;
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
		<button onclick={add}>{t('visits.add')}</button>
	</div>
	<p class="muted">
		{visits.length
			? t('visits.summary', { n: visits.length, cash: sum('cash'), twint: sum('twint'), open: sum('open') })
			: t('visits.none')}
	</p>
	{#if error}<p class="error">{error}</p>{/if}
	<ol class="visits">
		{#each visits as v (v.id)}
			{@const open = openId === v.id}
			<li class:owes={owes(v)}>
				<button class="summary" aria-expanded={open} onclick={() => (openId = open ? null : v.id)}>
					<span class="name">{v.label || t('visits.unnamed', { no: v.no })}</span>
					<span class="chips">
						{#each PARTS.slice(0, 2) as part (part.amount)}
							{#if v[part.amount] > 0}
								<span class="chip pay-{v[part.payment]}">{t(part.label)} {v[part.amount]} · {t(`pay.${v[part.payment]}`)}</span>
							{/if}
						{/each}
					</span>
					<span class="chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
				</button>
				{#if open}
					<div class="details">
						<label>{t('visits.label')}<input value={v.label} placeholder={t('visits.labelHint')} onchange={(e) => save(v, { label: e.currentTarget.value })} /></label>
						{#each PARTS as part (part.amount)}
							<div class="part">
								<label>{t(part.label)}<input type="number" min="0" inputmode="decimal" value={v[part.amount] || ''} placeholder="0"
									onchange={(e) => save(v, { [part.amount]: +e.currentTarget.value })} /></label>
								<div class="segmented" role="group" aria-label={t(part.label)}>
									{#each part.methods as p (p)}
										<button class={v[part.payment] === p ? `sel-pay-${p}` : ''} aria-pressed={v[part.payment] === p}
											onclick={() => save(v, { [part.payment]: p })}>{t(`pay.${p}`)}</button>
									{/each}
								</div>
							</div>
						{/each}
						<label>{t('visits.contact')}<input value={v.contact} onchange={(e) => save(v, { contact: e.currentTarget.value })} /></label>
						<label>{t('visits.notes')}<input value={v.notes} onchange={(e) => save(v, { notes: e.currentTarget.value })} /></label>
						<p><button class="destructive" onclick={() => remove(v)}>{t('visits.delete')}</button></p>
					</div>
				{/if}
			</li>
		{/each}
	</ol>
</section>

<style>
	section { margin-bottom: 12px; }
	.head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
	.visits { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
	.visits li { border: 1px solid var(--border); border-radius: 10px; }
	.visits li.owes { border-color: var(--amber); }
	.summary { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; width: 100%; text-align: left;
		background: none; border: none; color: inherit; font-weight: 400; padding: 8px 10px; }
	.name { font-weight: 600; flex: 1 1 auto; }
	.chips { display: flex; flex-wrap: wrap; gap: 4px; }
	.chip { font-size: 0.8rem; font-weight: 600; padding: 2px 8px; border-radius: 999px; color: white; white-space: nowrap; }
	.chip.pay-cash, .chip.pay-twint { background: var(--green); }
	.chip.pay-open { background: var(--amber); }
	.chevron { color: var(--muted); }
	.details { padding: 0 10px 10px; border-top: 1px solid var(--border); }
	.details label { margin-top: 10px; }
	.part { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: end; }
	.segmented button.sel-pay-cash, .segmented button.sel-pay-twint { background: var(--green); color: white; }
	.segmented button.sel-pay-open { background: var(--amber); color: white; }
</style>
