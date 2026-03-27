export interface Company {
    id?: number;
    name: string;
    tax_id?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    status?: 'active' | 'inactive';
    created_at?: Date;
}