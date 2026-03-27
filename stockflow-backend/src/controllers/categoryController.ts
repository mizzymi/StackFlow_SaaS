import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Category } from '../types/category';

interface CategoryRow extends Category, RowDataPacket { }

export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        let query = `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.company_id,
        c.created_at
      FROM categories c
    `;

        const params: (number | string | null)[] = [];

        if (req.user.role !== 'super_admin') {
            query += ` WHERE c.company_id = ?`;
            params.push(req.user.company_id ?? null);
        }

        query += ` ORDER BY c.id DESC`;

        const [rows] = await pool.query<CategoryRow[]>(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error getting categories:', error);
        res.status(500).json({ message: 'Error al obtener categorías' });
    }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;

        const [rows] = await pool.query<CategoryRow[]>(
            `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.company_id,
        c.created_at
      FROM categories c
      WHERE c.id = ?
      `,
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Categoría no encontrada' });
            return;
        }

        const category = rows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === category.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No tienes permisos para ver esta categoría' });
            return;
        }

        res.status(200).json(category);
    } catch (error) {
        console.error('Error getting category by id:', error);
        res.status(500).json({ message: 'Error al obtener la categoría' });
    }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { name, description, company_id } = req.body as Category;

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        let finalCompanyId: number | null = company_id ?? null;

        if (req.user.role !== 'super_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (!finalCompanyId) {
            res.status(400).json({ message: 'La categoría debe pertenecer a una empresa' });
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

        const [duplicateRows] = await pool.query<CategoryRow[]>(
            'SELECT id FROM categories WHERE name = ? AND company_id = ?',
            [name, finalCompanyId]
        );

        if (duplicateRows.length > 0) {
            res.status(409).json({ message: 'Ya existe una categoría con ese nombre en esta empresa' });
            return;
        }

        const [result] = await pool.query<ResultSetHeader>(
            `
      INSERT INTO categories (name, description, company_id)
      VALUES (?, ?, ?)
      `,
            [
                name,
                description ?? null,
                finalCompanyId
            ]
        );

        const [rows] = await pool.query<CategoryRow[]>(
            `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.company_id,
        c.created_at
      FROM categories c
      WHERE c.id = ?
      `,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Categoría creada correctamente',
            category: rows[0]
        });
    } catch (error) {
        console.error('Error creating category:', error);
        res.status(500).json({ message: 'Error al crear la categoría' });
    }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;
        const { name, description, company_id } = req.body as Category;

        const [existingRows] = await pool.query<CategoryRow[]>(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Categoría no encontrada' });
            return;
        }

        const existingCategory = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === existingCategory.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes editar categorías de otra empresa' });
            return;
        }

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        let finalCompanyId: number | null = company_id ?? existingCategory.company_id ?? null;

        if (req.user.role !== 'super_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (!finalCompanyId) {
            res.status(400).json({ message: 'La categoría debe pertenecer a una empresa' });
            return;
        }

        const [duplicateRows] = await pool.query<CategoryRow[]>(
            'SELECT id FROM categories WHERE name = ? AND company_id = ? AND id <> ?',
            [name, finalCompanyId, id]
        );

        if (duplicateRows.length > 0) {
            res.status(409).json({ message: 'Ya existe otra categoría con ese nombre en esta empresa' });
            return;
        }

        await pool.query<ResultSetHeader>(
            `
      UPDATE categories
      SET name = ?, description = ?, company_id = ?
      WHERE id = ?
      `,
            [
                name,
                description ?? null,
                finalCompanyId,
                id
            ]
        );

        const [updatedRows] = await pool.query<CategoryRow[]>(
            `
      SELECT 
        c.id,
        c.name,
        c.description,
        c.company_id,
        c.created_at
      FROM categories c
      WHERE c.id = ?
      `,
            [id]
        );

        res.status(200).json({
            message: 'Categoría actualizada correctamente',
            category: updatedRows[0]
        });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Error al actualizar la categoría' });
    }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;

        const [existingRows] = await pool.query<CategoryRow[]>(
            'SELECT * FROM categories WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Categoría no encontrada' });
            return;
        }

        const category = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === category.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes eliminar categorías de otra empresa' });
            return;
        }

        await pool.query<ResultSetHeader>(
            'DELETE FROM categories WHERE id = ?',
            [id]
        );

        res.status(200).json({ message: 'Categoría eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ message: 'Error al eliminar la categoría' });
    }
};