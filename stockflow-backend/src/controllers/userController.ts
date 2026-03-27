import { Request, Response } from 'express';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import bcrypt from 'bcryptjs';
import pool from '../config/db';
import { User } from '../types/user';

interface UserRow extends User, RowDataPacket { }

export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.company_id,
        u.created_at
      FROM users u
    `;

        let params: (string | number | null)[] = [];

        if (req.user.role === 'company_admin') {
            query += ` WHERE u.company_id = ?`;
            params.push(req.user.company_id ?? null);
        }

        query += ` ORDER BY u.id DESC`;

        const [rows] = await pool.query<UserRow[]>(query, params);

        res.status(200).json(rows);
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

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

        const targetUser = rows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === targetUser.company_id;
        const isOwnProfile = req.user.id === targetUser.id;

        if (!isSuperAdmin && !isSameCompany && !isOwnProfile) {
            res.status(403).json({ message: 'No tienes permisos para ver este usuario' });
            return;
        }

        res.status(200).json(targetUser);
    } catch (error) {
        console.error('Error getting user by id:', error);
        res.status(500).json({ message: 'Error al obtener el usuario' });
    }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

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

        let finalCompanyId: number | null = company_id ?? null;

        if (req.user.role === 'company_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (finalCompanyId) {
            const [companyRows] = await pool.query<RowDataPacket[]>(
                'SELECT id FROM companies WHERE id = ?',
                [finalCompanyId]
            );

            if (companyRows.length === 0) {
                res.status(400).json({ message: 'La empresa indicada no existe' });
                return;
            }
        }

        let finalRole = role ?? 'employee';

        if (req.user.role === 'company_admin') {
            finalRole = 'employee';
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await pool.query<ResultSetHeader>(
            `
      INSERT INTO users (name, email, password, role, company_id)
      VALUES (?, ?, ?, ?, ?)
      `,
            [
                name,
                email,
                hashedPassword,
                finalRole,
                finalCompanyId
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
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

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

        const existingUser = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === existingUser.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes editar usuarios de otra empresa' });
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

        const [emailRows] = await pool.query<UserRow[]>(
            'SELECT id FROM users WHERE email = ? AND id <> ?',
            [email, id]
        );

        if (emailRows.length > 0) {
            res.status(409).json({ message: 'Ya existe otro usuario con ese email' });
            return;
        }

        let finalCompanyId: number | null = company_id ?? existingUser.company_id ?? null;

        if (req.user.role === 'company_admin') {
            finalCompanyId = req.user.company_id ?? null;
        }

        if (finalCompanyId) {
            const [companyRows] = await pool.query<RowDataPacket[]>(
                'SELECT id FROM companies WHERE id = ?',
                [finalCompanyId]
            );

            if (companyRows.length === 0) {
                res.status(400).json({ message: 'La empresa indicada no existe' });
                return;
            }
        }

        let finalRole = role ?? existingUser.role ?? 'employee';

        if (req.user.role === 'company_admin') {
            finalRole = existingUser.role === 'super_admin' ? existingUser.role : 'employee';
        }

        let finalPassword = existingUser.password;

        if (password && password.trim() !== '') {
            finalPassword = await bcrypt.hash(password, 10);
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
                finalPassword,
                finalRole,
                finalCompanyId,
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
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const { id } = req.params;

        const [existingRows] = await pool.query<UserRow[]>(
            'SELECT * FROM users WHERE id = ?',
            [id]
        );

        if (existingRows.length === 0) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        const targetUser = existingRows[0];

        const isSuperAdmin = req.user.role === 'super_admin';
        const isSameCompany = req.user.company_id === targetUser.company_id;

        if (!isSuperAdmin && !isSameCompany) {
            res.status(403).json({ message: 'No puedes eliminar usuarios de otra empresa' });
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