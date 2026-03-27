import { Request, Response } from 'express';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { User } from '../types/user';
import { JwtPayloadData } from '../types/auth';

interface UserRow extends User, RowDataPacket { }

export const register = async (req: Request, res: Response): Promise<void> => {
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

        const [existingUsers] = await pool.query<UserRow[]>(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
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
                role ?? 'employee',
                company_id ?? null
            ]
        );

        const [rows] = await pool.query<UserRow[]>(
            `
      SELECT id, name, email, role, company_id, created_at
      FROM users
      WHERE id = ?
      `,
            [result.insertId]
        );

        res.status(201).json({
            message: 'Usuario registrado correctamente',
            user: rows[0]
        });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ message: 'Error al registrar el usuario' });
    }
};

export const registerCompany = async (req: Request, res: Response): Promise<void> => {
    const connection = await pool.getConnection();

    try {
        const {
            company_name,
            tax_id,
            company_email,
            phone,
            address,
            admin_name,
            admin_email,
            admin_password
        } = req.body as {
            company_name: string;
            tax_id?: string;
            company_email?: string;
            phone?: string;
            address?: string;
            admin_name: string;
            admin_email: string;
            admin_password: string;
        };

        if (!company_name || company_name.trim() === '') {
            res.status(400).json({ message: 'El nombre de la empresa es obligatorio' });
            return;
        }

        if (!admin_name || admin_name.trim() === '') {
            res.status(400).json({ message: 'El nombre del administrador es obligatorio' });
            return;
        }

        if (!admin_email || admin_email.trim() === '') {
            res.status(400).json({ message: 'El email del administrador es obligatorio' });
            return;
        }

        if (!admin_password || admin_password.trim() === '') {
            res.status(400).json({ message: 'La contraseña del administrador es obligatoria' });
            return;
        }

        const [existingUserRows] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM users WHERE email = ?',
            [admin_email]
        );

        if (existingUserRows.length > 0) {
            res.status(409).json({ message: 'Ya existe un usuario con ese email' });
            return;
        }

        await connection.beginTransaction();

        const [companyResult] = await connection.query<ResultSetHeader>(
            `
      INSERT INTO companies (name, tax_id, email, phone, address, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      `,
            [
                company_name,
                tax_id ?? null,
                company_email ?? null,
                phone ?? null,
                address ?? null
            ]
        );

        const companyId = companyResult.insertId;

        const hashedPassword = await bcrypt.hash(admin_password, 10);

        await connection.query<ResultSetHeader>(
            `
      INSERT INTO users (name, email, password, role, company_id)
      VALUES (?, ?, ?, 'company_admin', ?)
      `,
            [
                admin_name,
                admin_email,
                hashedPassword,
                companyId
            ]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Empresa registrada correctamente. Ya puedes iniciar sesión.'
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error registering company:', error);
        res.status(500).json({ message: 'Error al registrar la empresa' });
    } finally {
        connection.release();
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body as { email: string; password: string };

        if (!email || !password) {
            res.status(400).json({ message: 'Email y contraseña son obligatorios' });
            return;
        }

        const [rows] = await pool.query<UserRow[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            res.status(401).json({ message: 'Credenciales inválidas' });
            return;
        }

        const user = rows[0];

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            res.status(401).json({ message: 'Credenciales inválidas' });
            return;
        }

        const payload: JwtPayloadData = {
            id: user.id!,
            email: user.email,
            role: user.role ?? 'employee',
            company_id: user.company_id ?? null
        };

        const jwtSecret = process.env.JWT_SECRET;
        const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

        if (!jwtSecret) {
            throw new Error('JWT_SECRET no está definido en el archivo .env');
        }

        const token = jwt.sign(payload, jwtSecret, {
            expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn']
        });

        res.status(200).json({
            message: 'Login correcto',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                company_id: user.company_id
            }
        });
    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ message: 'Error al iniciar sesión' });
    }
};

export const profile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const [rows] = await pool.query<UserRow[]>(
            `
      SELECT id, name, email, role, company_id, created_at
      FROM users
      WHERE id = ?
      `,
            [req.user.id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Usuario no encontrado' });
            return;
        }

        res.status(200).json(rows[0]);
    } catch (error) {
        console.error('Error getting profile:', error);
        res.status(500).json({ message: 'Error al obtener el perfil' });
    }
};