import PocketBase from 'pocketbase';
import { setLang } from './i18n/index.svelte.js';

// PocketBase serves this app, so the API lives on the same origin.
export const pb = new PocketBase(typeof window === 'undefined' ? 'http://127.0.0.1:8090' : window.location.origin);

/**
 * @typedef {{ id: string, name: string, email: string, phone: string, has_key: boolean,
 *   is_admin: boolean, active: boolean, lang: '' | 'de' | 'en', avatar: string, collectionId: string }} Volunteer
 * @typedef {{ id: string, date: string, start: string, end: string, status: 'open' | 'closed',
 *   closed_reason: string, notes: string, sheet_totals?: { visitors?: number, material?: number } | null }} Session
 * @typedef {{ id: string, session: string, volunteer: string, answer: 'yes' | 'no' }} Answer
 * @typedef {{ id: string, weekday: number, start: string, end: string }} Rule
 * @typedef {'cash' | 'twint' | 'open'} Payment
 * @typedef {{ id: string, session: string, no: number, label: string, contact: string, entry_fee: number,
 *   material: number, donation: number, entry_payment: Payment, material_payment: Payment,
 *   donation_payment: 'cash' | 'twint', recorded_by: string, notes: string }} Visit
 */

/** The logged in volunteer, kept in sync with the PocketBase auth store. */
export const auth = $state({ /** @type {Volunteer | null} */ user: /** @type {any} */ (pb.authStore.record) });

pb.authStore.onChange((_token, record) => {
	auth.user = /** @type {any} */ (record);
	if (record?.lang) setLang(record.lang);
}, true);

export function logout() {
	pb.authStore.clear();
}

/** Today in Zurich as "YYYY-MM-DD". */
export function todayIso() {
	return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Zurich' });
}
