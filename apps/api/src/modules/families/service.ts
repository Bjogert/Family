import * as familyRepo from './repository.js';

export interface Family {
    id: number;
    name: string;
}

// Get all families
export async function getAllFamilies(): Promise<Family[]> {
    const families = await familyRepo.getAllFamilies();
    return families.map(f => ({
        id: f.id,
        name: f.name,
    }));
}

// Get family by ID
export async function getFamilyById(id: number): Promise<Family | null> {
    const family = await familyRepo.getFamilyById(id);
    if (!family) return null;
    return {
        id: family.id,
        name: family.name,
    };
}

// Create new family
export async function createFamily(name: string, password: string): Promise<Family> {
    const family = await familyRepo.createFamily(name, password);
    return {
        id: family.id,
        name: family.name,
    };
}

// Search families by name
export async function searchFamilies(searchTerm: string): Promise<Family[]> {
    const families = await familyRepo.searchFamilies(searchTerm);
    return families.map(f => ({
        id: f.id,
        name: f.name,
    }));
}

// Check if family exists
export async function familyExists(name: string): Promise<boolean> {
    const family = await familyRepo.getFamilyByName(name);
    return !!family;
}
// Get family members
export interface FamilyMember {
    id: number;
    username: string;
    displayName: string | null;
}

export async function getFamilyMembers(familyId: number): Promise<FamilyMember[]> {
    return familyRepo.getFamilyMembers(familyId);
}

// Create family member
export async function createFamilyMember(
    familyId: number,
    username: string,
    password?: string,
    displayName?: string
): Promise<FamilyMember> {
    return familyRepo.createFamilyMember(familyId, username, password, displayName);
}

// Verify family password
export async function verifyFamilyPassword(familyId: number, password: string): Promise<boolean> {
    return familyRepo.verifyFamilyPassword(familyId, password);
}

// Update family password
export async function updateFamilyPassword(familyId: number, newPassword: string): Promise<boolean> {
    return familyRepo.updateFamilyPassword(familyId, newPassword);
}