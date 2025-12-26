import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Store for the deferred install prompt
export const deferredPrompt = writable<BeforeInstallPromptEvent | null>(null);

// Whether the app is already installed
export const isInstalled = writable(false);

// Derived store: can we show the install button?
export const canInstall = derived(
    [deferredPrompt, isInstalled],
    ([$deferredPrompt, $isInstalled]) => $deferredPrompt !== null && !$isInstalled
);

// Initialize PWA detection
export function initPwaDetection() {
    if (!browser) return;

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        isInstalled.set(true);
        return;
    }

    // Check iOS standalone mode
    if ((window.navigator as any).standalone === true) {
        isInstalled.set(true);
        return;
    }

    // Listen for the install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt.set(e);
    });

    // Detect if app was installed
    window.addEventListener('appinstalled', () => {
        isInstalled.set(true);
        deferredPrompt.set(null);
    });
}

// Trigger the install prompt
export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    let prompt: BeforeInstallPromptEvent | null = null;

    const unsubscribe = deferredPrompt.subscribe(p => {
        prompt = p;
    });
    unsubscribe();

    if (!prompt) {
        return 'unavailable';
    }

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
        deferredPrompt.set(null);
    }

    return outcome;
}
