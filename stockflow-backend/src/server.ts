import dotenv from 'dotenv';
dotenv.config({ override: true });

import app from './app';
import pool from './config/db';

const PORT = process.env.PORT;

async function startServer() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado a MySQL correctamente');
    conn.release();

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error);
    process.exit(1);
  }
}

startServer();