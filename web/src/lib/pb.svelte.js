import PocketBase from 'pocketbase';
import { setLang } from './i18n/index.svelte.js';

// PocketBase serves this app, so the API lives on the same origin.
export const pb = new PocketBase(typeof window === 'undefined' ? 'http://127.0.0.1:8090' : window.location.origin);

/**
 * @typedef {{ id: string, name: string, email: string, phone: string, has_key: boolean,
 *   is_admin: boolean, active: boolean, lang: '' | 'de' | 'en' }} Volunteer
 * @typedef {{ id: string, date: string, start: string, end: string, status: 'open' | 'closed',
 *   closed_reason: string, lead: string, notes: string }} Opening
 * @typedef {{ id: string, opening: string, volunteer: string, answer: 'yes' | 'maybe' | 'no' }} Answer
 */

/** The logged in volunteer, kept in sync with the PocketBase auth store. */
export const session = $state({ /** @type {Volunteer | null} */ user: /** @type {any} */ (pb.authStore.record) });

pb.authStore.onChange((_token, record) => {
	session.user = /** @type {any} */ (record);
	if (record?.lang) setLang(record.lang);
}, true);

export function logout() {
	pb.authStore.clear();
}

/** Today in Zurich as "YYYY-MM-DD". */
export function todayIso() {
	return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });
}
