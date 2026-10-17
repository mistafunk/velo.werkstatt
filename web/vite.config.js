import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// The app is a single page app served by PocketBase from pb_public.
			adapter: adapter({ pages: '../pb/pb_public', fallback: 'index.html' })
		})
	],
	server: {
		// In development, forward API calls to a local PocketBase.
		proxy: { '/api': 'http://127.0.0.1:8090' }
	}
});
