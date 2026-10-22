import { Router } from 'express';
import { HttpError } from '../http/errors';
import { loginSchema, registerSchema } from './auth.schemas';
import * as authService from './auth.service';
import { endSession, requireAuth, startSession } from './session';

export const authRouter = Router();

/** Creates the account and signs the user in right away. */
authRouter.post('/register', async (req, res) => {
  const credentials = registerSchema.parse(req.body ?? {});
  const user = await authService.register(credentials);
  if (!user) throw new HttpError(409, 'Email already registered');
  startSession(res, user);
  res.status(201).json({ user });
});

authRouter.post('/login', async (req, res) => {
  const credentials = loginSchema.parse(req.body ?? {});
  const user = await authService.authenticate(credentials);
  // Same answer for an unknown email and a wrong password: it must not reveal which accounts exist.
  if (!user) throw new HttpError(401, 'Invalid email or password');
  startSession(res, user);
  res.json({ user });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// No session needed: logging out with an expired or missing session still clears the cookie.
authRouter.post('/logout', async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});
