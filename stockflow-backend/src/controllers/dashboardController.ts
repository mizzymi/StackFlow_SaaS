import { Request, Response } from 'express';
import { getDashboardData } from '../services/dashboardService';

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'No autenticado' });
            return;
        }

        const dashboardData = await getDashboardData(
            req.user.role,
            req.user.company_id ?? null
        );

        res.status(200).json(dashboardData);
    } catch (error) {
        console.error('Error getting dashboard:', error);
        res.status(500).json({ message: 'Error al obtener el dashboard' });
    }
};