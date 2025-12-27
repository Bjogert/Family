import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// BeforeInstallPromptEvent is a non-standard browser API for PWA installation
interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    prompt(): Promise<void>;
}

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
        deferredPrompt.set(e as BeforeInstallPromptEvent);
    });

    // Detect if app was installed
    window.addEventListener('appinstalled', () => {
        isInstalled.set(true);
        deferredPrompt.set(null);
    });
}

// Trigger the install prompt
export async function triggerInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    const prompt = get(deferredPrompt);

    if (!prompt) {
        return 'unavailable';
    }

    await prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
        deferredPrompt.set(null);
    }

    return outcome;
}
