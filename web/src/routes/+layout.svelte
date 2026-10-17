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
</header>

{#if auth.user}
	<nav>
		<a href={resolve('/')} class:current={page.url.pathname === resolve('/')}>{t('nav.schedule')}</a>
		<a href={resolve('/volunteers')} class:current={page.url.pathname === resolve('/volunteers')}
			>{t('nav.volunteers')}</a
		>
		<a href={resolve('/volunteers/[id]', { id: auth.user.id })}>{t('nav.profile')}</a>
		<button class="link" onclick={() => { logout(); goto(resolve('/login')); }}>{t('nav.logout')}</button>
	</nav>
{/if}

<main>
	{#if auth.user || onLogin}
		{@render children()}
	{/if}
</main>
