import type { Request, Response } from 'express';
import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * Resolves the authenticated Supabase session behind a Bearer token and
 * checks admin_users (service-role read, bypasses RLS — that table has no
 * client-facing policies at all). Never trusts a client-supplied email/role.
 */
export async function resolveAdminUser(authHeader?: string): Promise<AdminUser | null> {
  if (!authHeader || !supabase) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;

    const { data: adminRow } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!adminRow) return null;
    return { id: user.id, email: user.email ?? '' };
  } catch {
    return null;
  }
}

/** Route guard — writes the appropriate error response and returns null if unauthorized. */
export async function requireAdmin(req: Request, res: Response): Promise<AdminUser | null> {
  if (!supabase) {
    res.status(500).json({ error: 'Supabase client not initialized' });
    return null;
  }
  const admin = await resolveAdminUser(req.headers.authorization);
  if (!admin) {
    res.status(403).json({ error: 'Admin access required' });
    return null;
  }
  return admin;
}
