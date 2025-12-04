// src/utils/initServerData.ts - Initialize default admin user
import { getRolePermissions } from '@/lib/rbac';
import { serverStorage } from './serverStorage';

export function initializeServerData() {
  // Check if users already exist
  const users = serverStorage.load('users', []);

  if (users.length > 0) {
    console.log('Users already initialized');
    return;
  }

  console.log('Initializing default admin user...');

  // Create default admin user
  const defaultAdmin = {
    id: 'admin-001',
    name: 'Admin User',
    pin: '0000',
    role: 'admin' as const,
    department: 'Administration',
    permissions: getRolePermissions('admin'),
    isActive: true,
    createdAt: new Date().toISOString(),
    lastLogin: undefined,
  };

  serverStorage.save('users', [defaultAdmin]);
  console.log('Default admin user created with PIN: 0000');
}
