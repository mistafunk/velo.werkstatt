<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { pb, auth } from '#lib/pb.svelte.js';
	import { t, setLang } from '#lib/i18n/index.svelte.js';
	import Avatar from '#lib/Avatar.svelte';

	const isNew = $derived(page.params.id === 'new');
	const isAdmin = $derived(!!auth.user?.is_admin);
	const isSelf = $derived(page.params.id === auth.user?.id);
	const canEdit = $derived(isAdmin || isSelf);

	let form = $state({ name: '', email: '', phone: '', lang: 'de', has_key: false, is_admin: false, active: true });
	let error = $state('');
	let message = $state('');
	/** The stored record, for the avatar. @type {{ id: string, collectionId: string, name: string, avatar: string } | null} */
	let record = $state(null);

	$effect(() => {
		const id = page.params.id ?? '';
		message = '';
		error = '';
		record = null;
		if (id === 'new') {
			form = { name: '', email: '', phone: '', lang: 'de', has_key: false, is_admin: false, active: true };
			return;
		}
		pb.collection('users')
			.getOne(id)
			.then((v) => {
				record = { id: v.id, collectionId: v.collectionId, name: v.name, avatar: v.avatar };
				form = {
					name: v.name, email: v.email, phone: v.phone, lang: v.lang || 'de',
					has_key: v.has_key, is_admin: v.is_admin, active: v.active
				};
			})
			.catch((err) => (error = t('common.error', { message: err.message })));
	});

	/** @param {File | null} file the new picture, or null to remove it */
	async function setAvatar(file) {
		if (!record) return;
		error = '';
		message = '';
		try {
			const v = await pb.collection('users').update(record.id, { avatar: file });
			record.avatar = v.avatar;
			if (isSelf) await pb.collection('users').authRefresh();
		} catch (err) {
			const e = /** @type {any} */ (err);
			error = t('common.error', { message: e.response?.data?.avatar?.message ?? e.message });
		}
	}

	/** @param {SubmitEvent} e */
	async function save(e) {
		e.preventDefault();
		error = '';
		message = '';
		/** @type {Record<string, unknown>} */
		const data = { name: form.name, phone: form.phone, lang: form.lang, has_key: form.has_key };
		if (isAdmin) Object.assign(data, { email: form.email, is_admin: form.is_admin, active: form.active });
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
	{#if record}
		<div class="avatar-row">
			<Avatar v={record} size={72} />
			{#if canEdit}
				<div class="avatar-actions">
					<label class="button upload">
						{t('volunteer.avatarUpload')}
						<input type="file" accept="image/jpeg,image/png,image/webp"
							onchange={(e) => { const f = e.currentTarget.files?.[0]; if (f) setAvatar(f); e.currentTarget.value = ''; }} />
					</label>
					{#if record.avatar}<button type="button" class="destructive" onclick={() => setAvatar(null)}>{t('volunteer.avatarRemove')}</button>{/if}
					<span class="muted hint">{t('volunteer.avatarHint')}</span>
				</div>
			{/if}
		</div>
	{/if}
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

	<label class="check"><input type="checkbox" bind:checked={form.has_key} disabled={!canEdit} />{t('volunteer.hasKey')}</label>
	{#if isAdmin}
		<label class="check"><input type="checkbox" bind:checked={form.is_admin} />{t('volunteer.isAdmin')}</label>
		<label class="check"><input type="checkbox" bind:checked={form.active} />{t('volunteer.active')}</label>
	{/if}

	{#if canEdit}<p><button>{t('volunteer.save')}</button></p>{/if}
	{#if message}<p class="ok">{message}</p>{/if}
</form>

<style>
	.avatar-row { display: flex; align-items: center; gap: 16px; margin-bottom: 4px; }
	.avatar-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
	.upload { margin: 0; cursor: pointer; }
	.upload input { display: none; }
	.hint { flex-basis: 100%; font-size: 0.8rem; }
</style>
