// Helper functions for the application

/**
 * Get the ID from an object that might have either 'id' or '_id' (MongoDB)
 */
export function getId(obj: { id?: string; _id?: string } | undefined | null): string {
    if (!obj) return '';
    return obj.id || obj._id || '';
}

/**
 * Get category from a transaction's categoryId field
 * The field can be either a string ID or a populated Category object
 */
export function getCategoryFromTransaction(categoryId: any): any {
    if (!categoryId) return null;

    // If it's already a populated object with name, return it
    if (typeof categoryId === 'object' && categoryId.name) {
        return categoryId;
    }

    // Otherwise it's just an ID string
    return null;
}

/**
 * Get category ID from a transaction's categoryId field
 */
export function getCategoryId(categoryId: any): string {
    if (!categoryId) return '';

    // If it's a populated object, get its ID
    if (typeof categoryId === 'object') {
        return getId(categoryId);
    }

    // Otherwise it's already an ID string
    return categoryId;
}
