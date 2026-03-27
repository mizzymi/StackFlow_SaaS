import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { Company } from '../types/company';

interface CompanyRow extends Company, RowDataPacket { }

export const getCompanies = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [rows] = await pool.query<CompanyRow[]>('SELECT * FROM companies ORDER BY id DESC');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error getting companies:', error);
        res.status(500).json({ message: 'Error al obtener empresas' });
    }
};

export const getCompanyById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query<CompanyRow[]>(
            'SELECT * FROM companies WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Empresa no encontrada' });
            return;
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error getting company by id:', error);
        res.status(500).json({ message: 'Error al obtener la empresa' });
    }
};

export const createCompany = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, tax_id, email, phone, address, status } = req.body as Company;

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        const [result] = await pool.query<ResultSetHeader>(
            `
      INSERT INTO companies (name, tax_id, email, phone, address, status)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
            [
                name,
                tax_id ?? null,
                email ?? null,
                phone ?? null,
                address ?? null,
                status ?? 'active'
            ]
        );

        const [rows] = await pool.query<CompanyRow[]>(
            'SELECT * FROM companies WHERE id = ?',
            [result.insertId]
        );

        res.status(201).json({
            message: 'Empresa creada correctamente',
            company: rows[0]
        });
    } catch (error) {
        console.error('Error creating company:', error);
        res.status(500).json({ message: 'Error al crear la empresa' });
    }
};

export const updateCompany = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, tax_id, email, phone, address, status } = req.body as Company;

        const [existingRows] = await pool.query<CompanyRow[]>(
            'SELECT * FROM companies WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Empresa no encontrada' });
            return;
        }

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        await pool.query<ResultSetHeader>(
            `
      UPDATE companies
      SET name = ?, tax_id = ?, email = ?, phone = ?, address = ?, status = ?
      WHERE id = ?
      `,
            [
                name,
                tax_id ?? null,
                email ?? null,
                phone ?? null,
                address ?? null,
                status ?? 'active',
                id
            ]
        );

        const [updatedRows] = await pool.query<CompanyRow[]>(
            'SELECT * FROM companies WHERE id = ?',
            [id]
        );

        res.status(200).json({
            message: 'Empresa actualizada correctamente',
            company: updatedRows[0]
        });
    } catch (error) {
        console.error('Error updating company:', error);
        res.status(500).json({ message: 'Error al actualizar la empresa' });
    }
};

export const deleteCompany = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const [existingRows] = await pool.query<CompanyRow[]>(
            'SELECT * FROM companies WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Empresa no encontrada' });
            return;
        }

        await pool.query<ResultSetHeader>(
            'DELETE FROM companies WHERE id = ?',
            [id]
        );

        res.status(200).json({ message: 'Empresa eliminada correctamente' });
    } catch (error) {
        console.error('Error deleting company:', error);
        res.status(500).json({ message: 'Error al eliminar la empresa' });
    }
};