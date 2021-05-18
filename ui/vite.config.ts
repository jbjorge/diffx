import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [vue()],
	// optimizeDeps: {
	// 	include: ["@diffx/rxjs"]
	// },
	// build: {
	// 	rollupOptions: {
	// 		external: "@diffx/rxjs/dist/utils/internals"
	// 	}
	// }
	// resolve: {
	// 	alias: {
	// 		'@diffx/rxjs/utils': 'node_modules/@diffx/rxjs/dist/utils'
	// 	}
	// }
})
