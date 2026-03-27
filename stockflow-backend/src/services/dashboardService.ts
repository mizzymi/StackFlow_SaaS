import { RowDataPacket } from 'mysql2';
import pool from '../config/db';
import {
    DashboardResponse,
    DashboardSummary,
    LowStockProduct,
    RecentMovement
} from '../types/dashboard';

interface CountRow extends RowDataPacket {
    total: number;
}

interface LowStockRow extends RowDataPacket, LowStockProduct { }

interface RecentMovementRow extends RowDataPacket, RecentMovement { }

const buildWhereClause = (
    role: string,
    companyId: number | null,
    alias?: string
): { whereClause: string; params: (number | null)[] } => {
    const isSuperAdmin = role === 'super_admin';
    const prefix = alias ? `${alias}.` : '';

    if (isSuperAdmin) {
        return {
            whereClause: '',
            params: []
        };
    }

    return {
        whereClause: ` WHERE ${prefix}company_id = ?`,
        params: [companyId]
    };
};

const buildLowStockClause = (
    role: string,
    companyId: number | null,
    alias?: string
): { whereClause: string; params: (number | null)[] } => {
    const isSuperAdmin = role === 'super_admin';
    const prefix = alias ? `${alias}.` : '';

    if (isSuperAdmin) {
        return {
            whereClause: ` WHERE ${prefix}stock <= 5`,
            params: []
        };
    }

    return {
        whereClause: ` WHERE ${prefix}company_id = ? AND ${prefix}stock <= 5`,
        params: [companyId]
    };
};

export const getDashboardData = async (
    role: string,
    companyId: number | null
): Promise<DashboardResponse> => {
    const usersFilter = buildWhereClause(role, companyId);
    const productsFilter = buildWhereClause(role, companyId);
    const categoriesFilter = buildWhereClause(role, companyId);
    const suppliersFilter = buildWhereClause(role, companyId);
    const lowStockFilter = buildLowStockClause(role, companyId);
    const movementsFilter = buildWhereClause(role, companyId, 'im');

    const [
        usersResult,
        productsResult,
        categoriesResult,
        suppliersResult,
        lowStockCountResult,
        lowStockProductsResult,
        recentMovementsResult
    ] = await Promise.all([
        pool.query<CountRow[]>(
            `SELECT COUNT(*) AS total FROM users${usersFilter.whereClause}`,
            usersFilter.params
        ),
        pool.query<CountRow[]>(
            `SELECT COUNT(*) AS total FROM products${productsFilter.whereClause}`,
            productsFilter.params
        ),
        pool.query<CountRow[]>(
            `SELECT COUNT(*) AS total FROM categories${categoriesFilter.whereClause}`,
            categoriesFilter.params
        ),
        pool.query<CountRow[]>(
            `SELECT COUNT(*) AS total FROM suppliers${suppliersFilter.whereClause}`,
            suppliersFilter.params
        ),
        pool.query<CountRow[]>(
            `SELECT COUNT(*) AS total FROM products${lowStockFilter.whereClause}`,
            lowStockFilter.params
        ),
        pool.query<LowStockRow[]>(
            `
      SELECT id, name, stock, sku, company_id
      FROM products
      ${lowStockFilter.whereClause}
      ORDER BY stock ASC, id DESC
      LIMIT 5
      `,
            lowStockFilter.params
        ),
        pool.query<RecentMovementRow[]>(
            `
      SELECT
        im.id,
        im.product_id,
        p.name AS product_name,
        im.user_id,
        u.name AS user_name,
        im.company_id,
        im.type,
        im.quantity,
        im.reason,
        im.created_at
      FROM inventory_movements im
      INNER JOIN products p ON im.product_id = p.id
      INNER JOIN users u ON im.user_id = u.id
      ${movementsFilter.whereClause}
      ORDER BY im.created_at DESC
      LIMIT 10
      `,
            movementsFilter.params
        )
    ]);

    const [usersRows] = usersResult;
    const [productsRows] = productsResult;
    const [categoriesRows] = categoriesResult;
    const [suppliersRows] = suppliersResult;
    const [lowStockCountRows] = lowStockCountResult;
    const [lowStockProductsRows] = lowStockProductsResult;
    const [recentMovementsRows] = recentMovementsResult;

    const summary: DashboardSummary = {
        total_users: usersRows[0]?.total ?? 0,
        total_products: productsRows[0]?.total ?? 0,
        total_categories: categoriesRows[0]?.total ?? 0,
        total_suppliers: suppliersRows[0]?.total ?? 0,
        low_stock_products: lowStockCountRows[0]?.total ?? 0
    };

    return {
        summary,
        lowStockProducts: lowStockProductsRows,
        recentMovements: recentMovementsRows
    };
};