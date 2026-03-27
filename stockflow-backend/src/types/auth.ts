export interface JwtPayloadData {
    id: number;
    email: string;
    role: 'super_admin' | 'company_admin' | 'employee';
    company_id: number | null;
}