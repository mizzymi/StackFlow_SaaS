import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardSummary {
    total_users: number;
    total_products: number;
    total_categories: number;
    total_suppliers: number;
    low_stock_products: number;
}

export interface LowStockProduct {
    id: number;
    name: string;
    stock: number;
    sku: string | null;
    company_id: number;
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
    created_at: string;
}

export interface DashboardResponse {
    summary: DashboardSummary;
    lowStockProducts: LowStockProduct[];
    recentMovements: RecentMovement[];
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private apiUrl = 'http://localhost:3000/api/dashboard';

    getDashboard(): Observable<DashboardResponse> {
        return this.http.get<DashboardResponse>(this.apiUrl);
    }
}