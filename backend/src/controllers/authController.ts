import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/db.js';
import { ENV } from '../config/env.js';
import { generateVynkUID, normalizeUID, isUIDAvailable } from '../utils/uid.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { UserProfile, UserStats } from '../../../shared/types.js';
import { buildUserProfile } from './userController.js';

export const authController = {
  // Register new account
  register: async (req: Request, res: Response) => {
    try {
      const { name, email, password, uid: requestedUID, interests = [] } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      // Check existing email
      const existingEmail = query.get('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
      if (existingEmail) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }

      // Handle UID
      let finalUID: string;
      if (requestedUID && requestedUID.trim()) {
        finalUID = normalizeUID(requestedUID);
        if (!isUIDAvailable(finalUID)) {
          return res.status(400).json({ error: `UID @${finalUID} is already taken. Try another!` });
        }
      } else {
        // Auto generate UID
        do {
          finalUID = generateVynkUID();
        } while (!isUIDAvailable(finalUID));
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = uuidv4();

      query.run(`
        INSERT INTO users (id, uid, name, email, password_hash, avatar_url, bio, is_verified)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        finalUID,
        name.trim(),
        email.trim().toLowerCase(),
        passwordHash,
        `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        'Exploring real moments on Vynk. ✨',
        0
      ]);

      // Add default interests
      const defaultInterests = interests.length ? interests : ['Tech & AI', 'Travel', 'Photography'];
      for (const item of defaultInterests) {
        query.run('INSERT INTO user_interests (id, user_id, interest) VALUES (?, ?, ?)', [
          uuidv4(),
          userId,
          item
        ]);
      }

      const userRow = query.get('SELECT * FROM users WHERE id = ?', [userId]);
      const userProfile = buildUserProfile(userRow, userId);

      const token = jwt.sign(
        { id: userProfile.id, uid: userProfile.uid, email: userProfile.email, name: userProfile.name },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      return res.status(201).json({
        message: 'Account created successfully!',
        token,
        user: userProfile
      });
    } catch (err: any) {
      console.error('Register error:', err);
      return res.status(500).json({ error: 'Internal server error during registration.' });
    }
  },

  // Login
  login: async (req: Request, res: Response) => {
    try {
      const { identifier, password } = req.body; // identifier can be email or UID
      if (!identifier || !password) {
        return res.status(400).json({ error: 'Identifier (email or UID) and password are required.' });
      }

      const cleanIdentifier = identifier.trim().toLowerCase().replace(/^@/, '');
      const userRow = query.get(`
        SELECT * FROM users 
        WHERE LOWER(email) = ? OR LOWER(uid) = ? OR LOWER(uid) = ?
      `, [cleanIdentifier, cleanIdentifier, `vynk.${cleanIdentifier}`]);

      if (!userRow) {
        return res.status(401).json({ error: 'Invalid credentials. User not found.' });
      }

      const isMatch = await bcrypt.compare(password, userRow.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials. Password incorrect.' });
      }

      const userProfile = buildUserProfile(userRow, userRow.id);
      const token = jwt.sign(
        { id: userProfile.id, uid: userProfile.uid, email: userProfile.email, name: userProfile.name },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      return res.json({
        message: 'Welcome back to Vynk!',
        token,
        user: userProfile
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login.' });
    }
  },

  // Get current session user
  me: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated.' });
      }

      const userRow = query.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
      if (!userRow) {
        return res.status(404).json({ error: 'User profile not found.' });
      }

      const userProfile = buildUserProfile(userRow, req.user.id);
      return res.json({ user: userProfile });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch current user profile.' });
    }
  },

  // Quick Switch / Demo Login (convenient for reviewers & testing)
  demoAccounts: async (req: Request, res: Response) => {
    try {
      const users = query.all('SELECT id, uid, name, email, avatar_url, bio FROM users LIMIT 6');
      return res.json({ users });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch demo accounts.' });
    }
  },

  demoLogin: async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const userRow = query.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!userRow) {
        return res.status(404).json({ error: 'Demo user not found.' });
      }

      const userProfile = buildUserProfile(userRow, userRow.id);
      const token = jwt.sign(
        { id: userProfile.id, uid: userProfile.uid, email: userProfile.email, name: userProfile.name },
        ENV.JWT_SECRET,
        { expiresIn: ENV.JWT_EXPIRES_IN as any }
      );

      return res.json({
        message: `Switched to demo account @${userProfile.uid}`,
        token,
        user: userProfile
      });
    } catch (err) {
      return res.status(500).json({ error: 'Demo login failed.' });
    }
  }
};
