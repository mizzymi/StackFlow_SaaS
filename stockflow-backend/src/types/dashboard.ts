export interface DashboardSummary {
    total_users: number;
    total_products: number;
    total_categories: number;
    total_suppliers: number;
    low_stock_products: number;
}

export interface RecentMovement {
    id: number;
    product_id: number;
    product_name: string;
    user_id: number;
    user_name: string;
    company_id: number;
    type: 'in' | 'out';
    quantity: number;
    reason: string | null;
    created_at: Date;
}

export interface LowStockProduct {
    id: number;
    name: string;
    stock: number;
    sku: string | null;
    company_id: number;
}

export interface DashboardResponse {
    summary: DashboardSummary;
    lowStockProducts: LowStockProduct[];
    recentMovements: RecentMovement[];
}