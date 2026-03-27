import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import router from './routes';

dotenv.config({ override: true });

const app = express();

const corsOptions = {
    origin: 'http://localhost:4200',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));

app.use(express.json());

app.use('/api', router);

export default app;