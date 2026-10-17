import de from './de.js';
import en from './en.js';

/** @type {Record<'de' | 'en', Record<string, string>>} */
const dictionaries = { de, en };
const STORAGE_KEY = 'velo.lang';

/** @typedef {'de' | 'en'} Lang */

/** @returns {Lang} */
function initialLang() {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === 'de' || saved === 'en') return saved;
	} catch {
		// storage unavailable, fall through
	}
	return typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'de';
}

/** @type {{ lang: Lang }} */
export const i18n = $state({ lang: initialLang() });

/** @param {Lang} lang */
export function setLang(lang) {
	i18n.lang = lang;
	try {
		localStorage.setItem(STORAGE_KEY, lang);
	} catch {
		// ignore
	}
	document.documentElement.lang = lang;
}

/**
 * Translate a key, replacing {placeholders} with params.
 * @param {keyof typeof de} key
 * @param {Record<string, string | number>} [params]
 */
export function t(key, params = {}) {
	const text = dictionaries[i18n.lang][key] ?? de[key] ?? key;
	return text.replace(/\{(\w+)\}/g, (/** @type {string} */ _, /** @type {string} */ name) => String(params[name] ?? `{${name}}`));
}

/**
 * Format an ISO date ("YYYY-MM-DD") for the current language.
 * @param {string} iso
 * @param {Intl.DateTimeFormatOptions} [opts]
 */
export function formatDate(iso, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
	const locale = i18n.lang === 'de' ? 'de-CH' : 'en-GB';
	return new Date(iso + 'T12:00:00').toLocaleDateString(locale, opts);
}
