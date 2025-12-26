export interface GroceryUser {
    id: number;
    name: string;
}

export interface GroceryItem {
    id: number;
    name: string;
    category: string;
    quantity: number;
    unit: string | null;
    isBought: boolean;
    isFavorite: boolean;
    addedBy: GroceryUser | null;
    boughtBy: GroceryUser | null;
    createdAt: string;
    updatedAt: string;
    boughtAt: string | null;
}

export interface CategoryInfo {
    name: string;
    icon: string;
    sortOrder: number;
}

export interface GroupedCategory {
    category: CategoryInfo;
    items: GroceryItem[];
}
