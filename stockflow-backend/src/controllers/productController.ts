import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Product } from '../types/product';

interface ProductRow extends Product, RowDataPacket {
    category_name?: string | null;
    supplier_name?: string | null;
}

export const getProducts = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        let query = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.supplier_id,
        s.name AS supplier_name,
        p.company_id,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `;

        const params: (number | string | null)[] = [];

        if (req.user.role !== 'super_admin') {
            query += ` WHERE p.company_id = ?`;
            params.push(req.user.company_id ?? null);
        }

        query += ` ORDER BY p.id DESC`;

        const [rows] = await pool.query<ProductRow[]>(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error getting products:', error);
        res.status(500).json({ message: 'Error al obtener productos' });
    }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;

        const [rows] = await pool.query<ProductRow[]>(
            `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.supplier_id,
        s.name AS supplier_name,
        p.company_id,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
      `,
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Producto no encontrado' });
            return;
        }

        const product = rows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === product.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No tienes permisos para ver este producto' });
            return;
        }

        res.status(200).json(product);
    } catch (error) {
        console.error('Error getting product by id:', error);
        res.status(500).json({ message: 'Error al obtener el producto' });
    }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const {
            name,
            description,
            price,
            stock,
            sku,
            category_id,
            supplier_id,
            company_id
        } = req.body as Product;

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        let finalCompanyId: number | null = company_id ?? null;

        if (req.user.role !== 'super_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (!finalCompanyId) {
            res.status(400).json({ message: 'El producto debe pertenecer a una empresa' });
            return;
        }

        const [companyRows] = await pool.query<RowDataPacket[]>(
            'SELECT id FROM companies WHERE id = ?',
            [finalCompanyId]
        );

        if (companyRows.length === 0) {
            res.status(400).json({ message: 'La empresa indicada no existe' });
            return;
        }

        if (category_id) {
            const [categoryRows] = await pool.query<RowDataPacket[]>(
                'SELECT id, company_id FROM categories WHERE id = ?',
                [category_id]
            );

            if (categoryRows.length === 0) {
                res.status(400).json({ message: 'La categoría indicada no existe' });
                return;
            }

            if (categoryRows[0].company_id !== finalCompanyId) {
                res.status(400).json({ message: 'La categoría no pertenece a la misma empresa' });
                return;
            }
        }

        if (supplier_id) {
            const [supplierRows] = await pool.query<RowDataPacket[]>(
                'SELECT id, company_id FROM suppliers WHERE id = ?',
                [supplier_id]
            );

            if (supplierRows.length === 0) {
                res.status(400).json({ message: 'El proveedor indicado no existe' });
                return;
            }

            if (supplierRows[0].company_id !== finalCompanyId) {
                res.status(400).json({ message: 'El proveedor no pertenece a la misma empresa' });
                return;
            }
        }

        const [result] = await pool.query<ResultSetHeader>(
            `
      INSERT INTO products (
        name,
        description,
        price,
        stock,
        sku,
        category_id,
        supplier_id,
        company_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
            [
                name,
                description ?? null,
                price ?? 0,
                stock ?? 0,
                sku ?? null,
                category_id ?? null,
                supplier_id ?? null,
                finalCompanyId
            ]
        );

        const [rows] = await pool.query<ProductRow[]>(
            `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.supplier_id,
        s.name AS supplier_name,
        p.company_id,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
      `,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Producto creado correctamente',
            product: rows[0]
        });
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error al crear el producto' });
    }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;
        const {
            name,
            description,
            price,
            stock,
            sku,
            category_id,
            supplier_id,
            company_id
        } = req.body as Product;

        const [existingRows] = await pool.query<ProductRow[]>(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Producto no encontrado' });
            return;
        }

        const existingProduct = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === existingProduct.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes editar productos de otra empresa' });
            return;
        }

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        let finalCompanyId: number | null = company_id ?? existingProduct.company_id ?? null;

        if (req.user.role !== 'super_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (!finalCompanyId) {
            res.status(400).json({ message: 'El producto debe pertenecer a una empresa' });
            return;
        }

        if (category_id) {
            const [categoryRows] = await pool.query<RowDataPacket[]>(
                'SELECT id, company_id FROM categories WHERE id = ?',
                [category_id]
            );

            if (categoryRows.length === 0) {
                res.status(400).json({ message: 'La categoría indicada no existe' });
                return;
            }

            if (categoryRows[0].company_id !== finalCompanyId) {
                res.status(400).json({ message: 'La categoría no pertenece a la misma empresa' });
                return;
            }
        }

        if (supplier_id) {
            const [supplierRows] = await pool.query<RowDataPacket[]>(
                'SELECT id, company_id FROM suppliers WHERE id = ?',
                [supplier_id]
            );

            if (supplierRows.length === 0) {
                res.status(400).json({ message: 'El proveedor indicado no existe' });
                return;
            }

            if (supplierRows[0].company_id !== finalCompanyId) {
                res.status(400).json({ message: 'El proveedor no pertenece a la misma empresa' });
                return;
            }
        }

        await pool.query<ResultSetHeader>(
            `
      UPDATE products
      SET
        name = ?,
        description = ?,
        price = ?,
        stock = ?,
        sku = ?,
        category_id = ?,
        supplier_id = ?,
        company_id = ?
      WHERE id = ?
      `,
            [
                name,
                description ?? null,
                price ?? 0,
                stock ?? 0,
                sku ?? null,
                category_id ?? null,
                supplier_id ?? null,
                finalCompanyId,
                id
            ]
        );

        const [updatedRows] = await pool.query<ProductRow[]>(
            `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.sku,
        p.category_id,
        c.name AS category_name,
        p.supplier_id,
        s.name AS supplier_name,
        p.company_id,
        p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id = ?
      `,
            [id]
        );

        res.status(200).json({
            message: 'Producto actualizado correctamente',
            product: updatedRows[0]
        });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error al actualizar el producto' });
    }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;

        const [existingRows] = await pool.query<ProductRow[]>(
            'SELECT * FROM products WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Producto no encontrado' });
            return;
        }

        const product = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === product.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes eliminar productos de otra empresa' });
            return;
        }

        await pool.query<ResultSetHeader>(
            'DELETE FROM products WHERE id = ?',
            [id]
        );

        res.status(200).json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error al eliminar el producto' });
    }
};