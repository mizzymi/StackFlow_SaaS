export interface Product {
    id?: number;
    name: string;
    description?: string | null;
    price?: number;
    stock?: number;
    sku?: string | null;
    category_id?: number | null;
    supplier_id?: number | null;
    company_id?: number | null;
    created_at?: Date;
}