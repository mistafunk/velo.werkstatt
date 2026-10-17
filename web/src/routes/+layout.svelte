<script>
	import favicon from '#lib/assets/favicon.svg';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { auth, logout } from '#lib/pb.svelte.js';
	import { i18n, t } from '#lib/i18n/index.svelte.js';
	import '../app.css';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	const onLogin = $derived(page.url.pathname === resolve('/login'));

	$effect(() => {
		if (!auth.user && !onLogin) goto(resolve('/login'));
	});

	$effect(() => {
		document.documentElement.lang = i18n.lang;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{t('appName')}</title>
</svelte:head>

<header>
	<a class="brand" href={resolve('/')}>🚲 {t('appName')}</a>
	{#if auth.user}
		{@const profile = resolve('/volunteers/[id]', { id: auth.user.id })}
		<div class="icons">
			<a href={profile} class="hdr-icon" class:current={page.url.pathname === profile} aria-label={t('nav.profile')} title={t('nav.profile')}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
			</a>
			<button class="hdr-icon" onclick={() => { logout(); goto(resolve('/login')); }} aria-label={t('nav.logout')} title={t('nav.logout')}>
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
			</button>
		</div>
	{/if}
</header>

{#if auth.user}
	<nav>
		<a href={resolve('/')} class:current={page.url.pathname === resolve('/')}>{t('nav.schedule')}</a>
		<a href={resolve('/volunteers')} class:current={page.url.pathname === resolve('/volunteers')}
			>{t('nav.volunteers')}</a
		>
	</nav>
{/if}

<main>
	{#if auth.user || onLogin}
		{@render children()}
	{/if}
</main>
