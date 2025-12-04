// src/pages/api/admin/users/[id]/reset-pin.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { withRBAC } from '@/lib/rbac';
import { User } from '@/hooks/useAuth';
import { storage } from '@/utils/storage';
import { generateSecurePIN, hashPIN } from '@/utils/auth';
import { validateBody, validateParams, ResetPinSchema, UUIDSchema } from '@/lib/validation';
import { logger } from '@/lib/logger';

async function handler(req: NextApiRequest, res: NextApiResponse, adminUser: User) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  // Validate user ID
  const idValidation = validateParams(UUIDSchema, id);
  if (!idValidation.success) {
    logger.warn('Invalid user ID for PIN reset', { errors: idValidation.details });
    return res.status(400).json(idValidation);
  }

  const userId = idValidation.data;

  // Validate request body (newPin is required)
  const bodyValidation = validateBody(ResetPinSchema, req.body);
  if (!bodyValidation.success) {
    logger.warn('PIN reset validation failed', { errors: bodyValidation.details, userId });
    return res.status(400).json(bodyValidation);
  }

  const { newPin } = bodyValidation.data;
  const { reason } = req.body;

  try {
    const users = storage.load('users', []) as User[];
    const userIndex = users.findIndex((u) => u.id === userId);

    if (userIndex === -1) {
      logger.warn('User not found for PIN reset', { userId });
      return res.status(404).json({ error: 'User not found' });
    }

    // Use the validated new PIN (already validated to be 4 digits)
    const hashedPIN = hashPIN(newPin);

    // Update user PIN
    users[userIndex].pin = hashedPIN;
    storage.save('users', users);

    logger.security('PIN_RESET', {
      userId,
      userName: users[userIndex].name,
      resetBy: adminUser.id,
      resetByName: adminUser.name,
      reason: reason || 'No reason provided',
    });

    // Log PIN reset to audit trail
    logAuditEvent({
      action: 'PIN_RESET',
      performedBy: adminUser.id,
      performedByName: adminUser.name,
      targetUserId: userId,
      targetUserName: users[userIndex].name,
      details: { reason: reason || 'No reason provided' },
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      message: 'PIN reset successfully',
      tempPIN: newPin,
      user: { ...users[userIndex], pin: undefined },
    });
  } catch (error) {
    logger.error('Reset PIN error', error as Error, { userId, adminUser: adminUser.id });
    return res.status(500).json({ error: 'Failed to reset PIN' });
  }
}

function logAuditEvent(event: any) {
  const auditLogs: any[] = storage.load('auditLogs', []);
  auditLogs.push(event);

  if (auditLogs.length > 50000) {
    auditLogs.splice(0, auditLogs.length - 50000);
  }

  storage.save('auditLogs', auditLogs);
}

export default withRBAC(handler, {
  requiredRole: 'admin',
  requiredPermission: 'canManageUsers',
});
