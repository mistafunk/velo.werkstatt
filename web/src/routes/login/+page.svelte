<script>
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { pb } from '#lib/pb.svelte.js';
	import { t } from '#lib/i18n/index.svelte.js';

	let email = $state('');
	let code = $state('');
	let otpId = $state('');
	let error = $state('');
	let busy = $state(false);

	/** @param {SubmitEvent} e */
	async function requestCode(e) {
		e.preventDefault();
		busy = true;
		error = '';
		try {
			const res = await pb.collection('users').requestOTP(email.trim());
			otpId = res.otpId;
		} catch (err) {
			error = t('common.error', { message: /** @type {Error} */ (err).message });
		} finally {
			busy = false;
		}
	}

	/** @param {SubmitEvent} e */
	async function login(e) {
		e.preventDefault();
		busy = true;
		error = '';
		try {
			await pb.collection('users').authWithOTP(otpId, code.trim());
			goto(resolve('/'));
		} catch {
			error = t('login.failed');
		} finally {
			busy = false;
		}
	}
</script>

<h1>{t('login.title')}</h1>
<div class="card" style="max-width: 420px">
	{#if !otpId}
		<form onsubmit={requestCode}>
			<label for="email">{t('login.email')}</label>
			<input id="email" type="email" autocomplete="email" required bind:value={email} />
			<p><button class="primary" disabled={busy}>{t('login.sendCode')}</button></p>
		</form>
	{:else}
		<form onsubmit={login}>
			<p>{t('login.codeSent', { email })}</p>
			<p class="muted">{t('login.unknown')}</p>
			<label for="code">{t('login.code')}</label>
			<input id="code" inputmode="numeric" autocomplete="one-time-code" required bind:value={code} />
			<p>
				<button class="primary" disabled={busy}>{t('login.submit')}</button>
				<button type="button" class="link" onclick={() => { otpId = ''; code = ''; }}>{t('login.otherEmail')}</button>
			</p>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</div>
