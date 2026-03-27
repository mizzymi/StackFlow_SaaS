export interface User {
    id?: number;
    name: string;
    email: string;
    password: string;
    role?: 'super_admin' | 'company_admin' | 'employee';
    company_id?: number | null;
    created_at?: Date;
}