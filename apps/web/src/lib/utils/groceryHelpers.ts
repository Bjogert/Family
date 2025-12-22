import type { CategoryInfo, GroceryItem, GroupedCategory } from '$lib/types/grocery';

export function getCategoryIcon(categories: CategoryInfo[], categoryName: string): string {
    const cat = categories.find((c) => c.name === categoryName);
    return cat?.icon || '📦';
}

export function groupItemsByCategory(
    items: GroceryItem[],
    categories: CategoryInfo[],
    categoryOrder: string[]
): GroupedCategory[] {
    const groups = new Map<string, GroceryItem[]>();
    for (const item of items) {
        const existing = groups.get(item.category) || [];
        existing.push(item);
        groups.set(item.category, existing);
    }

    const categoriesWithItems = categories.filter((c) => groups.has(c.name));

    if (categoryOrder.length > 0) {
        const sorted = [...categoriesWithItems].sort((a, b) => {
            const aIndex = categoryOrder.indexOf(a.name);
            const bIndex = categoryOrder.indexOf(b.name);
            const aPos = aIndex === -1 ? 999 : aIndex;
            const bPos = bIndex === -1 ? 999 : bIndex;
            return aPos - bPos;
        });
        return sorted.map((c) => ({ category: c, items: groups.get(c.name) || [] }));
    } else {
        const sorted = categoriesWithItems.sort((a, b) => a.sortOrder - b.sortOrder);
        return sorted.map((c) => ({ category: c, items: groups.get(c.name) || [] }));
    }
}

export function loadCategoryOrder(): string[] {
    if (typeof localStorage === 'undefined') return [];
    const saved = localStorage.getItem('categoryOrder');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return [];
        }
    }
    return [];
}

export function saveCategoryOrder(order: string[]): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem('categoryOrder', JSON.stringify(order));
}

export function initializeCategoryOrder(
    currentOrder: string[],
    groupedItems: GroupedCategory[]
): string[] {
    if (currentOrder.length === 0 && groupedItems.length > 0) {
        return groupedItems.map((g) => g.category.name);
    } else if (groupedItems.length > 0) {
        const currentCategories = groupedItems.map((g) => g.category.name);
        const newCategories = currentCategories.filter((c) => !currentOrder.includes(c));
        if (newCategories.length > 0) {
            return [...currentOrder, ...newCategories];
        }
    }
    return currentOrder;
}
