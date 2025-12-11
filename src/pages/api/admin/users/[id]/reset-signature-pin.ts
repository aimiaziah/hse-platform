// src/pages/api/admin/users/[id]/reset-signature-pin.ts
// Admin-only endpoint to reset user signature PINs
import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserRow = Database['public']['Tables']['users']['Row'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    const supabase = getServiceSupabase();

    // Check if user exists
    const { data: user, error: userError } = (await supabase
      .from('users')
      .select('id, name, signature_pin')
      .eq('id', id)
      .single()) as { data: UserRow | null; error: any };

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has a signature PIN set
    if (!user.signature_pin) {
      return res.status(400).json({
        error: 'User does not have a signature PIN set',
        message: 'This user has not set up their signature PIN yet.',
      });
    }

    // Reset signature PIN and signature data
    const { error: updateError } = await (supabase.from('users') as any)
      .update({
        signature_pin: null,
        signature_created_at: null,
        signature: null, // Also clear the signature so they can set it up again
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error resetting signature PIN:', updateError);
      return res.status(500).json({ error: 'Failed to reset signature PIN' });
    }

    return res.status(200).json({
      success: true,
      message: `Signature PIN for ${user.name} has been reset successfully. They can now set up a new signature and PIN.`,
    });
  } catch (error) {
    console.error('Error in reset signature PIN:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
