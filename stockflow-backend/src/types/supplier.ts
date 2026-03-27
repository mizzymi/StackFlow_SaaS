export interface Supplier {
    id?: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    company_id?: number | null;
    created_at?: Date;
}