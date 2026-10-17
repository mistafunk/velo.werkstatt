<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { pb, session } from '#lib/pb.svelte.js';
	import { t, setLang } from '#lib/i18n/index.svelte.js';

	const isNew = $derived(page.params.id === 'new');
	const isAdmin = $derived(!!session.user?.is_admin);
	const isSelf = $derived(page.params.id === session.user?.id);
	const canEdit = $derived(isAdmin || isSelf);

	let form = $state({ name: '', email: '', phone: '', lang: 'de', has_key: false, is_admin: false, active: true });
	let error = $state('');
	let message = $state('');

	$effect(() => {
		const id = page.params.id ?? '';
		message = '';
		error = '';
		if (id === 'new') {
			form = { name: '', email: '', phone: '', lang: 'de', has_key: false, is_admin: false, active: true };
			return;
		}
		pb.collection('users')
			.getOne(id)
			.then((v) => {
				form = {
					name: v.name, email: v.email, phone: v.phone, lang: v.lang || 'de',
					has_key: v.has_key, is_admin: v.is_admin, active: v.active
				};
			})
			.catch((err) => (error = t('common.error', { message: err.message })));
	});

	/** @param {SubmitEvent} e */
	async function save(e) {
		e.preventDefault();
		error = '';
		message = '';
		/** @type {Record<string, unknown>} */
		const data = { name: form.name, phone: form.phone, lang: form.lang };
		if (isAdmin) Object.assign(data, { email: form.email, has_key: form.has_key, is_admin: form.is_admin, active: form.active });
		try {
			if (isNew) {
				const created = await pb.collection('users').create({ ...data, emailVisibility: true });
				message = t('volunteer.created');
				goto(resolve('/volunteers/[id]', { id: created.id }));
			} else {
				await pb.collection('users').update(page.params.id ?? '', data);
				message = t('volunteer.saved');
				if (isSelf) {
					await pb.collection('users').authRefresh();
					setLang(/** @type {'de' | 'en'} */ (form.lang));
				}
			}
		} catch (err) {
			const e = /** @type {any} */ (err);
			const details = Object.entries(e.response?.data ?? {}).map(([k, v]) => `${k}: ${v.message}`).join(', ');
			error = t('common.error', { message: details || e.message });
		}
	}
</script>

<p><a href={resolve('/volunteers')}>← {t('common.back')}</a></p>
<h1>{isNew ? t('volunteers.new') : form.name || form.email}</h1>
{#if error}<p class="error">{error}</p>{/if}

<form class="card" onsubmit={save} style="max-width: 520px">
	<label for="name">{t('volunteer.name')}</label>
	<input id="name" required bind:value={form.name} disabled={!canEdit} />

	<label for="email">{t('volunteer.email')}</label>
	<input id="email" type="email" required bind:value={form.email} disabled={!isAdmin} />

	<label for="phone">{t('volunteer.phone')}</label>
	<input id="phone" type="tel" bind:value={form.phone} disabled={!canEdit} />

	<label for="lang">{t('volunteer.lang')}</label>
	<select id="lang" bind:value={form.lang} disabled={!canEdit}>
		<option value="de">Deutsch</option>
		<option value="en">English</option>
	</select>

	<label class="check"><input type="checkbox" bind:checked={form.has_key} disabled={!isAdmin} />{t('volunteer.hasKey')}</label>
	<label class="check"><input type="checkbox" bind:checked={form.is_admin} disabled={!isAdmin} />{t('volunteer.isAdmin')}</label>
	<label class="check"><input type="checkbox" bind:checked={form.active} disabled={!isAdmin} />{t('volunteer.active')}</label>
	{#if !isAdmin}<p class="muted">{t('volunteer.adminOnly')}</p>{/if}

	{#if canEdit}<p><button class="primary">{t('volunteer.save')}</button></p>{/if}
	{#if message}<p class="ok">{message}</p>{/if}
</form>
