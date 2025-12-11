// src/pages/api/admin/users/[id]/signature.ts
// API endpoint for managing user signatures and signature PINs
import { NextApiRequest, NextApiResponse } from 'next';
import { getServiceSupabase } from '@/lib/supabase';
import { Database } from '@/types/database';

type UserRow = Database['public']['Tables']['users']['Row'];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  try {
    switch (req.method) {
      case 'PUT':
        return await updateSignature(req, res, id);
      case 'POST':
        return await verifySignaturePin(req, res, id);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Signature API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Update or create signature with PIN
async function updateSignature(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { signature, signaturePin } = req.body;

  if (!signature) {
    return res.status(400).json({ error: 'Signature is required' });
  }

  if (!signaturePin || signaturePin.length < 4) {
    return res.status(400).json({ error: 'Signature PIN must be at least 4 characters' });
  }

  try {
    const supabase = getServiceSupabase();

    // Check if user exists
    const { data: user, error: userError } = (await supabase
      .from('users')
      .select('id, role, signature_pin, signature_created_at')
      .eq('id', userId)
      .single()) as { data: UserRow | null; error: any };

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if signature PIN is already set (one-time setup only)
    if (user.signature_pin && user.signature_created_at) {
      return res.status(403).json({
        error: 'Signature PIN is already set and cannot be changed',
        message: 'For security reasons, signature PIN can only be set once. Please contact an administrator to reset your signature PIN.',
        isLocked: true,
      });
    }

    // Prepare update data for first-time setup
    const updateData: any = {
      signature,
      signature_pin: signaturePin,
      signature_created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Update signature and PIN
    const { error: updateError } = await (supabase.from('users') as any)
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating signature:', updateError);
      return res.status(500).json({ error: 'Failed to update signature' });
    }

    return res.status(200).json({
      success: true,
      message: 'Signature saved successfully',
    });
  } catch (error) {
    console.error('Error in updateSignature:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Verify signature PIN
async function verifySignaturePin(req: NextApiRequest, res: NextApiResponse, userId: string) {
  const { signaturePin } = req.body;

  if (!signaturePin) {
    return res.status(400).json({ error: 'Signature PIN is required' });
  }

  try {
    const supabase = getServiceSupabase();

    // Get user's signature PIN
    const { data: user, error: userError } = (await supabase
      .from('users')
      .select('id, signature_pin, signature')
      .eq('id', userId)
      .single()) as { data: UserRow | null; error: any };

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.signature_pin) {
      return res.status(400).json({ error: 'No signature PIN set for this user' });
    }

    // Verify PIN (simple comparison - in production, consider using bcrypt)
    const isValid = user.signature_pin === signaturePin;

    if (isValid) {
      return res.status(200).json({
        success: true,
        message: 'PIN verified successfully',
        signature: user.signature,
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Incorrect signature PIN',
    });
  } catch (error) {
    console.error('Error in verifySignaturePin:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
