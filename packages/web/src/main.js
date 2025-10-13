import { mount } from 'svelte';
import App from './components/App.svelte';
import { ServiceCoordinator } from './bridge/service-coordinator';

// Initialize service coordinator (sets up event listeners)
const coordinator = new ServiceCoordinator();

// Mount Svelte app
const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;