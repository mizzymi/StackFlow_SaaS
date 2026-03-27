import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Supplier } from '../types/supplier';

interface SupplierRow extends Supplier, RowDataPacket { }

export const getSuppliers = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        let query = `
      SELECT
        s.id,
        s.name,
        s.email,
        s.phone,
        s.address,
        s.company_id,
        s.created_at
      FROM suppliers s
    `;

        const params: (number | string | null)[] = [];

        if (req.user.role !== 'super_admin') {
            query += ` WHERE s.company_id = ?`;
            params.push(req.user.company_id ?? null);
        }

        query += ` ORDER BY s.id DESC`;

        const [rows] = await pool.query<SupplierRow[]>(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error getting suppliers:', error);
        res.status(500).json({ message: 'Error al obtener proveedores' });
    }
};

export const getSupplierById = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;

        const [rows] = await pool.query<SupplierRow[]>(
            `
      SELECT
        s.id,
        s.name,
        s.email,
        s.phone,
        s.address,
        s.company_id,
        s.created_at
      FROM suppliers s
      WHERE s.id = ?
      `,
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Proveedor no encontrado' });
            return;
        }

        const supplier = rows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === supplier.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No tienes permisos para ver este proveedor' });
            return;
        }

        res.status(200).json(supplier);
    } catch (error) {
        console.error('Error getting supplier by id:', error);
        res.status(500).json({ message: 'Error al obtener el proveedor' });
    }
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { name, email, phone, address, company_id } = req.body as Supplier;

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        let finalCompanyId: number | null = company_id ?? null;

        if (req.user.role !== 'super_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (!finalCompanyId) {
            res.status(400).json({ message: 'El proveedor debe pertenecer a una empresa' });
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

        const [duplicateRows] = await pool.query<SupplierRow[]>(
            'SELECT id FROM suppliers WHERE name = ? AND company_id = ?',
            [name, finalCompanyId]
        );

        if (duplicateRows.length > 0) {
            res.status(409).json({ message: 'Ya existe un proveedor con ese nombre en esta empresa' });
            return;
        }

        const [result] = await pool.query<ResultSetHeader>(
            `
      INSERT INTO suppliers (name, email, phone, address, company_id)
      VALUES (?, ?, ?, ?, ?)
      `,
            [
                name,
                email ?? null,
                phone ?? null,
                address ?? null,
                finalCompanyId
            ]
        );

        const [rows] = await pool.query<SupplierRow[]>(
            `
      SELECT
        s.id,
        s.name,
        s.email,
        s.phone,
        s.address,
        s.company_id,
        s.created_at
      FROM suppliers s
      WHERE s.id = ?
      `,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Proveedor creado correctamente',
            supplier: rows[0]
        });
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ message: 'Error al crear el proveedor' });
    }
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;
        const { name, email, phone, address, company_id } = req.body as Supplier;

        const [existingRows] = await pool.query<SupplierRow[]>(
            'SELECT * FROM suppliers WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Proveedor no encontrado' });
            return;
        }

        const existingSupplier = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === existingSupplier.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes editar proveedores de otra empresa' });
            return;
        }

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        let finalCompanyId: number | null = company_id ?? existingSupplier.company_id ?? null;

        if (req.user.role !== 'super_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (!finalCompanyId) {
            res.status(400).json({ message: 'El proveedor debe pertenecer a una empresa' });
            return;
        }

        const [duplicateRows] = await pool.query<SupplierRow[]>(
            'SELECT id FROM suppliers WHERE name = ? AND company_id = ? AND id <> ?',
            [name, finalCompanyId, id]
        );

        if (duplicateRows.length > 0) {
            res.status(409).json({ message: 'Ya existe otro proveedor con ese nombre en esta empresa' });
            return;
        }

        await pool.query<ResultSetHeader>(
            `
      UPDATE suppliers
      SET name = ?, email = ?, phone = ?, address = ?, company_id = ?
      WHERE id = ?
      `,
            [
                name,
                email ?? null,
                phone ?? null,
                address ?? null,
                finalCompanyId,
                id
            ]
        );

        const [updatedRows] = await pool.query<SupplierRow[]>(
            `
      SELECT
        s.id,
        s.name,
        s.email,
        s.phone,
        s.address,
        s.company_id,
        s.created_at
      FROM suppliers s
      WHERE s.id = ?
      `,
            [id]
        );

        res.status(200).json({
            message: 'Proveedor actualizado correctamente',
            supplier: updatedRows[0]
        });
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ message: 'Error al actualizar el proveedor' });
    }
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;

        const [existingRows] = await pool.query<SupplierRow[]>(
            'SELECT * FROM suppliers WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Proveedor no encontrado' });
            return;
        }

        const supplier = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === supplier.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes eliminar proveedores de otra empresa' });
            return;
        }

        await pool.query<ResultSetHeader>(
            'DELETE FROM suppliers WHERE id = ?',
            [id]
        );

        res.status(200).json({ message: 'Proveedor eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ message: 'Error al eliminar el proveedor' });
    }
};