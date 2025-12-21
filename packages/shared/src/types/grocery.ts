import { z } from 'zod';
import {
  CreateGrocerySchema,
  UpdateGrocerySchema,
  GroceryItemSchema,
  GroceryCategorySchema,
  CategoryInfoSchema,
} from '../schemas/grocery.js';

// Infer types from Zod schemas
export type GroceryCategory = z.infer<typeof GroceryCategorySchema>;
export type CreateGrocery = z.infer<typeof CreateGrocerySchema>;
export type UpdateGrocery = z.infer<typeof UpdateGrocerySchema>;
export type GroceryItem = z.infer<typeof GroceryItemSchema>;
export type CategoryInfo = z.infer<typeof CategoryInfoSchema>;

// Category metadata
export const CATEGORY_META: Record<GroceryCategory, { icon: string; label: string }> = {
  produce: { icon: '🥬', label: 'Produce' },
  dairy: { icon: '🥛', label: 'Dairy' },
  meat: { icon: '🥩', label: 'Meat' },
  bakery: { icon: '🍞', label: 'Bakery' },
  frozen: { icon: '🧊', label: 'Frozen' },
  beverages: { icon: '🥤', label: 'Beverages' },
  snacks: { icon: '🍿', label: 'Snacks' },
  household: { icon: '🧹', label: 'Household' },
  pet: { icon: '🐕', label: 'Pet Supplies' },
  other: { icon: '📦', label: 'Other' },
};
