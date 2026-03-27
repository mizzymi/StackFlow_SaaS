import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { InventoryMovement } from '../types/inventory-movement';

interface InventoryMovementRow extends InventoryMovement, RowDataPacket {
    product_name?: string;
    user_name?: string;
}

export const getInventoryMovements = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        let query = `
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
    `;

        const params: (number | string | null)[] = [];

        if (req.user.role !== 'super_admin') {
            query += ` WHERE im.company_id = ?`;
            params.push(req.user.company_id ?? null);
        }

        query += ` ORDER BY im.id DESC`;

        const [rows] = await pool.query<InventoryMovementRow[]>(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error getting inventory movements:', error);
        res.status(500).json({ message: 'Error al obtener movimientos de inventario' });
    }
};

export const createInventoryMovement = async (req: Request, res: Response): Promise<void> => {
    const connection = await pool.getConnection();

    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { product_id, type, quantity, reason } = req.body as InventoryMovement;

        if (!product_id) {
            res.status(400).json({ message: 'El producto es obligatorio' });
            return;
        }

        if (!type || !['in', 'out'].includes(type)) {
            res.status(400).json({ message: 'El tipo debe ser "in" o "out"' });
            return;
        }

        if (!quantity || quantity <= 0) {
            res.status(400).json({ message: 'La cantidad debe ser mayor que 0' });
            return;
        }

        const [productRows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM products WHERE id = ?',
            [product_id]
        );

        if (productRows.length === 0) {
            res.status(404).json({ message: 'Producto no encontrado' });
            return;
        }

        const product = productRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === product.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes registrar movimientos para productos de otra empresa' });
            return;
        }

        const currentStock = Number(product.stock);
        let newStock = currentStock;

        if (type === 'in') {
            newStock = currentStock + quantity;
        } else {
            if (currentStock < quantity) {
                res.status(400).json({ message: 'No hay stock suficiente para realizar la salida' });
                return;
            }

            newStock = currentStock - quantity;
        }

        await connection.beginTransaction();

        await connection.query<ResultSetHeader>(
            `
      INSERT INTO inventory_movements (product_id, user_id, company_id, type, quantity, reason)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
            [
                product_id,
                req.user.id,
                product.company_id,
                type,
                quantity,
                reason ?? null
            ]
        );

        await connection.query<ResultSetHeader>(
            'UPDATE products SET stock = ? WHERE id = ?',
            [newStock, product_id]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Movimiento registrado correctamente',
            stock_actualizado: newStock
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error creating inventory movement:', error);
        res.status(500).json({ message: 'Error al registrar el movimiento' });
    } finally {
        connection.release();
    }
};