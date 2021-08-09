import { createApp } from 'vue'
import App from './App.vue'
import './index.css'

createApp(App).mount('#app');

if (process.env.NODE_ENV === 'development') {
	import('../test/screenshots-generator');
}
