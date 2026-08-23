import { Request, Response, NextFunction } from 'express';
import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { unauthorized } from '../utils/errors.js';

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo_cucei, password } = req.body;
    
    const userRes = await pool.query('SELECT * FROM users WHERE codigo_cucei = $1', [codigo_cucei]);
    if (userRes.rows.length === 0) {
      throw unauthorized('Credenciales inválidas');
    }
    const user = userRes.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw unauthorized('Credenciales inválidas');
    }

    const payload = {
      id: user.id,
      codigo_cucei: user.codigo_cucei,
      rol: user.rol
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
    
    res.json({ token, user: payload });
  } catch (error) {
    next(error);
  }
}