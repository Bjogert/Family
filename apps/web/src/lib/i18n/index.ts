import { writable, derived } from 'svelte/store';
import { translations, type Language, type TranslationKey } from './translations';

// Get saved language from localStorage or default to Swedish
function getInitialLanguage(): Language {
    if (typeof window === 'undefined') return 'sv';
    const saved = localStorage.getItem('language');
    if (saved && (saved === 'sv' || saved === 'en' || saved === 'pt')) {
        return saved as Language;
    }
    return 'sv';
}

export const currentLanguage = writable<Language>(getInitialLanguage());

// Save to localStorage when language changes
if (typeof window !== 'undefined') {
    currentLanguage.subscribe((lang) => {
        localStorage.setItem('language', lang);
    });
}

export const t = derived(currentLanguage, ($lang) => {
    return (key: TranslationKey): string => {
        return translations[$lang][key] || key;
    };
});

export function setLanguage(lang: Language) {
    currentLanguage.set(lang);
}

export const languages = [
    { code: 'sv' as Language, name: 'Svenska', flag: '🇸🇪' },
    { code: 'en' as Language, name: 'English', flag: '🇬🇧' },
    { code: 'pt' as Language, name: 'Português', flag: '🇧🇷' },
];
