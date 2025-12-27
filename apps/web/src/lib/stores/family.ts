import { writable, derived, get as getStore } from 'svelte/store';
import { get } from '$lib/api/client';
import { currentFamily } from './auth';

export interface FamilyMember {
    id: number;
    username: string;
    displayName: string | null;
    hasPassword: boolean;
    role: string | null;
    birthday: string | null;
    gender: string | null;
    avatarEmoji: string | null;
    color: string | null;
}

interface FamilyState {
    members: FamilyMember[];
    loading: boolean;
    loaded: boolean;
}

function createFamilyStore() {
    const { subscribe, set, update } = writable<FamilyState>({
        members: [],
        loading: false,
        loaded: false,
    });

    return {
        subscribe,

        async loadMembers() {
            // Get family ID from auth store
            const family = getStore(currentFamily);
            if (!family?.id) {
                console.warn('No family ID available, cannot load members');
                return;
            }

            // Prevent duplicate calls
            const currentState = getStore({ subscribe });
            if (currentState.loading || currentState.loaded) {
                return;
            }

            update(state => ({ ...state, loading: true }));
            try {
                const response = await get<{ users: FamilyMember[] }>(`/families/${family.id}/users`);
                if (response?.users) {
                    update(state => ({
                        members: response.users,
                        loading: false,
                        loaded: true,
                    }));
                } else {
                    update(state => ({ ...state, loading: false, loaded: true }));
                }
            } catch (error) {
                console.error('Failed to load family members:', error);
                update(state => ({ ...state, loading: false, loaded: true }));
            }
        },

        reset() {
            set({ members: [], loading: false, loaded: false });
        }
    };
}

export const familyStore = createFamilyStore();

// Derived stores for easy access
export const familyMembers = derived(familyStore, $store => $store.members);
export const familyLoading = derived(familyStore, $store => $store.loading);
export const familyLoaded = derived(familyStore, $store => $store.loaded);
