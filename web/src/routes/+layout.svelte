<script>
	import favicon from '#lib/assets/favicon.svg';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { pb, session, logout } from '#lib/pb.svelte.js';
	import { i18n, setLang, t } from '#lib/i18n/index.svelte.js';
	import '../app.css';

	/** @type {{children: import('svelte').Snippet}} */
	let { children } = $props();

	const onLogin = $derived(page.url.pathname === resolve('/login'));

	$effect(() => {
		if (!session.user && !onLogin) goto(resolve('/login'));
	});

	$effect(() => {
		document.documentElement.lang = i18n.lang;
	});

	/** @param {'de' | 'en'} lang */
	async function switchLang(lang) {
		setLang(lang);
		if (session.user && session.user.lang !== lang) {
			await pb.collection('users').update(session.user.id, { lang });
			await pb.collection('users').authRefresh();
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{t('appName')}</title>
</svelte:head>

<header>
	<a class="brand" href={resolve('/')}>🚲 {t('appName')}</a>
	<div class="lang">
		<button class:active={i18n.lang === 'de'} onclick={() => switchLang('de')}>DE</button>
		<button class:active={i18n.lang === 'en'} onclick={() => switchLang('en')}>EN</button>
	</div>
</header>

{#if session.user}
	<nav>
		<a href={resolve('/')} class:current={page.url.pathname === resolve('/')}>{t('nav.schedule')}</a>
		<a href={resolve('/volunteers')} class:current={page.url.pathname === resolve('/volunteers')}
			>{t('nav.volunteers')}</a
		>
		{#if session.user.is_admin}
			<a href={resolve('/hours')} class:current={page.url.pathname === resolve('/hours')}>{t('nav.hours')}</a>
		{/if}
		<a href={resolve('/volunteers/[id]', { id: session.user.id })}>{t('nav.profile')}</a>
		<button class="link" onclick={() => { logout(); goto(resolve('/login')); }}>{t('nav.logout')}</button>
	</nav>
{/if}

<main>
	{#if session.user || onLogin}
		{@render children()}
	{/if}
</main>
