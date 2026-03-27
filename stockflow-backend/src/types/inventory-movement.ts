export interface InventoryMovement {
    id?: number;
    product_id: number;
    user_id?: number;
    company_id?: number;
    type: 'in' | 'out';
    quantity: number;
    reason?: string | null;
    created_at?: Date;
}