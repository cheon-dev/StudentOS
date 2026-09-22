import type { Timestamp } from 'firebase/firestore'

export const inventoryCategories = ['Electronics', 'School Supplies', 'IoT Components', 'Tools', 'Books', 'Accessories', 'Other'] as const
export type InventoryCategory = (typeof inventoryCategories)[number]
export const inventoryConditions = ['New', 'Good', 'Fair', 'Needs Repair', 'Broken'] as const
export type InventoryCondition = (typeof inventoryConditions)[number]
export type InventoryFormData = { name: string; category: InventoryCategory; description: string; quantity: number; location: string; condition: InventoryCondition; purchaseDate: string; purchasePrice: number | null; serialNumber: string; notes: string }
export type InventoryItem = InventoryFormData & { id: string; qrCode: string; createdAt: Timestamp | null; updatedAt: Timestamp | null }
export function emptyInventory(): InventoryFormData { return { name: '', category: 'Electronics', description: '', quantity: 1, location: '', condition: 'Good', purchaseDate: '', purchasePrice: null, serialNumber: '', notes: '' } }
