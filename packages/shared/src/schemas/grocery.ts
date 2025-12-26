import { z } from 'zod';

// Grocery categories
export const GroceryCategorySchema = z.enum([
  'produce',
  'dairy',
  'meat',
  'bakery',
  'frozen',
  'beverages',
  'snacks',
  'household',
  'pet',
  'other',
]);

// Create grocery item
export const CreateGrocerySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long'),
  category: GroceryCategorySchema.default('other'),
  quantity: z
    .number()
    .int()
    .positive()
    .default(1),
  unit: z
    .string()
    .max(20)
    .optional(),
  addedBy: z
    .string()
    .max(50)
    .optional(),
});

// Update grocery item (all fields optional)
export const UpdateGrocerySchema = z.object({
  name: z
    .string()
    .min(1)
    .max(100)
    .optional(),
  category: GroceryCategorySchema.optional(),
  quantity: z
    .number()
    .int()
    .positive()
    .optional(),
  unit: z
    .string()
    .max(20)
    .nullable()
    .optional(),
  isBought: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

// Grocery item from database
export const GroceryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: GroceryCategorySchema,
  quantity: z.number(),
  unit: z.string().nullable(),
  isBought: z.boolean(),
  addedBy: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  boughtAt: z.string().nullable(),
});

// Category info
export const CategoryInfoSchema = z.object({
  name: GroceryCategorySchema,
  icon: z.string(),
  sortOrder: z.number(),
});

// API response schemas
export const GroceryListResponseSchema = z.object({
  items: z.array(GroceryItemSchema),
});

export const CategoriesResponseSchema = z.object({
  categories: z.array(CategoryInfoSchema),
});
