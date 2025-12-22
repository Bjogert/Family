import * as repository from './repository.js';
import type { GroceryRow, CreateGroceryData, UpdateGroceryData } from './repository.js';

export interface GroceryItem {
    id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string | null;
    isBought: boolean;
    addedBy: { id: number; name: string } | null;
    boughtBy: { id: number; name: string } | null;
    createdAt: string;
    updatedAt: string;
    boughtAt: string | null;
}

function toGroceryItem(row: GroceryRow): GroceryItem {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        quantity: row.quantity,
        unit: row.unit,
        isBought: row.is_bought,
        addedBy: row.added_by ? { id: row.added_by, name: row.added_by_name || 'Unknown' } : null,
        boughtBy: row.bought_by ? { id: row.bought_by, name: row.bought_by_name || 'Unknown' } : null,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        boughtAt: row.bought_at?.toISOString() || null,
    };
}

export async function getAllGroceries(familyId: number): Promise<GroceryItem[]> {
    const rows = await repository.findAllByFamily(familyId);
    return rows.map(toGroceryItem);
}

export async function getGroceryById(id: number, familyId: number): Promise<GroceryItem | null> {
    const row = await repository.findById(id, familyId);
    return row ? toGroceryItem(row) : null;
}

export async function createGrocery(data: CreateGroceryData): Promise<GroceryItem> {
    const row = await repository.create(data);
    return toGroceryItem(row);
}

export async function updateGrocery(
    id: number,
    familyId: number,
    data: UpdateGroceryData
): Promise<GroceryItem | null> {
    const row = await repository.update(id, familyId, data);
    return row ? toGroceryItem(row) : null;
}

export async function deleteGrocery(id: number, familyId: number): Promise<boolean> {
    return repository.remove(id, familyId);
}

export async function clearBoughtGroceries(familyId: number): Promise<number> {
    return repository.clearBought(familyId);
}

export interface CategoryInfo {
    name: string;
    icon: string;
    sortOrder: number;
}

export async function getCategories(): Promise<CategoryInfo[]> {
    const rows = await repository.getCategories();
    return rows.map((row) => ({
        name: row.name,
        icon: row.icon,
        sortOrder: row.sort_order,
    }));
}
