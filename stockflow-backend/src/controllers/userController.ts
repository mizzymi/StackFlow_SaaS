import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db';
import { User } from '../types/user';

interface UserRow extends User, RowDataPacket { }

export const getUsers = async (_req: Request, res: Response): Promise<void> => {
    try {
        const [rows] = await pool.query<UserRow[]>(
            `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.company_id,
        u.created_at
      FROM users u
      ORDER BY u.id DESC
      `
        );

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const [rows] = await pool.query<UserRow[]>(
            `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.company_id,
        u.created_at
      FROM users u
      WHERE u.id = ?
      `,
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error getting user by id:', error);
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role, company_id } = req.body as User;

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        if (!email || email.trim() === '') {
            res.status(400).json({ message: 'El email es obligatorio' });
            return;
        }

        if (!password || password.trim() === '') {
            res.status(400).json({ message: 'La contraseña es obligatoria' });
            return;
        }

        const [emailRows] = await pool.query<UserRow[]>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (emailRows.length > 0) {
            res.status(409).json({ message: 'Ya existe un usuario con ese email' });
            return;
        }

        if (company_id) {
            const [companyRows] = await pool.query<RowDataPacket[]>(
                'SELECT id FROM companies WHERE id = ?',
                [company_id]
            );

            if (companyRows.length === 0) {
                res.status(400).json({ message: 'La empresa indicada no existe' });
                return;
            }
        }

        const [result] = await pool.query<ResultSetHeader>(
            `
      INSERT INTO users (name, email, password, role, company_id)
      VALUES (?, ?, ?, ?, ?)
      `,
            [
                name,
                email,
                password,
                role ?? 'employee',
                company_id ?? null
            ]
        );

        const [rows] = await pool.query<UserRow[]>(
            `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.company_id,
        u.created_at
      FROM users u
      WHERE u.id = ?
      `,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Usuario creado correctamente',
            user: rows[0]
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error al crear el usuario' });
    }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, email, password, role, company_id } = req.body as User;

        const [existingRows] = await pool.query<UserRow[]>(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        if (!name || name.trim() === '') {
            res.status(400).json({ message: 'El nombre es obligatorio' });
            return;
        }

        if (!email || email.trim() === '') {
            res.status(400).json({ message: 'El email es obligatorio' });
            return;
        }

        if (!password || password.trim() === '') {
            res.status(400).json({ message: 'La contraseña es obligatoria' });
            return;
        }

        const [emailRows] = await pool.query<UserRow[]>(
            'SELECT id FROM users WHERE email = ? AND id <> ?',
            [email, id]
        );

        if (emailRows.length > 0) {
            res.status(409).json({ message: 'Ya existe otro usuario con ese email' });
            return;
        }

        if (company_id) {
            const [companyRows] = await pool.query<RowDataPacket[]>(
                'SELECT id FROM companies WHERE id = ?',
                [company_id]
            );

            if (companyRows.length === 0) {
                res.status(400).json({ message: 'La empresa indicada no existe' });
                return;
            }
        }

        await pool.query<ResultSetHeader>(
            `
      UPDATE users
      SET name = ?, email = ?, password = ?, role = ?, company_id = ?
      WHERE id = ?
      `,
            [
                name,
                email,
                password,
                role ?? 'employee',
                company_id ?? null,
                id
            ]
        );

        const [updatedRows] = await pool.query<UserRow[]>(
            `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.company_id,
        u.created_at
      FROM users u
      WHERE u.id = ?
      `,
            [id]
        );

        res.status(200).json({
            message: 'Usuario actualizado correctamente',
            user: updatedRows[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error al actualizar el usuario' });
    }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const [existingRows] = await pool.query<UserRow[]>(
            'SELECT id FROM users WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        await pool.query<ResultSetHeader>(
            'DELETE FROM users WHERE id = ?',
            [id]
        );

        res.status(200).json({ message: 'Usuario eliminado correctamente' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error al eliminar el usuario' });
    }
};