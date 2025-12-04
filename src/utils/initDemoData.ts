// src/utils/initDemoData.ts
import { storage } from './storage';

export function initializeDemoData() {
  // Check if demo data already initialized
  const initialized = storage.load('demoDataInitialized', false);
  if (initialized) {
    return;
  }

  console.log('Initializing demo data...');

  // Initialize sample inspections
  const sampleInspections = [
    {
      id: 'insp-001',
      formType: 'hse-inspection',
      inspectorId: 'inspector',
      inspectorName: 'Inspector Demo',
      location: 'Building A - Floor 3',
      department: 'Safety',
      status: 'submitted',
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      signature:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      items: [
        {
          id: '1',
          category: 'Safety Equipment',
          item: 'Fire Extinguisher',
          rating: 'PASS',
          comments: 'All good',
          requiresAction: false,
        },
        {
          id: '2',
          category: 'Safety Equipment',
          item: 'Emergency Exit',
          rating: 'PASS',
          comments: 'Clear',
          requiresAction: false,
        },
      ],
      googleDriveExport: {
        status: 'success' as const,
        fileId: 'demo-file-123',
        exportedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    {
      id: 'insp-002',
      formType: 'fire-extinguisher',
      inspectorId: 'inspector',
      inspectorName: 'Inspector Demo',
      location: 'Building B - Floor 1',
      building: 'Building B',
      floor: '1',
      extinguisherType: 'ABC Dry Chemical',
      serialNumber: 'FE-2024-001',
      status: 'submitted',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      signature:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      items: [
        {
          id: '1',
          category: 'Physical Condition',
          item: 'Cylinder Condition',
          rating: 'PASS',
          comments: 'Good',
          requiresAction: false,
        },
      ],
      googleDriveExport: {
        status: 'success' as const,
        fileId: 'demo-file-124',
        exportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
    {
      id: 'insp-003',
      formType: 'first-aid',
      inspectorId: 'inspector',
      inspectorName: 'Inspector Demo',
      location: 'Building A - Floor 1',
      status: 'submitted',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      signature:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      items: [
        {
          id: '1',
          category: 'Basic Supplies',
          item: 'Bandages',
          rating: 'PASS',
          comments: 'Fully stocked',
          requiresAction: false,
        },
      ],
      googleDriveExport: {
        status: 'pending' as const,
      },
    },
  ];

  storage.save('inspections', sampleInspections);

  // Initialize audit logs
  const auditLogs = [
    {
      action: 'USER_LOGIN',
      performedBy: 'admin',
      performedByName: 'Admin User',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      details: { success: true },
    },
    {
      action: 'USER_CREATED',
      performedBy: 'admin',
      performedByName: 'Admin User',
      targetUserId: 'inspector',
      targetUserName: 'Inspector Demo',
      timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      details: { role: 'inspector' },
    },
    {
      action: 'INSPECTION_CREATED',
      performedBy: 'inspector',
      performedByName: 'Inspector Demo',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      details: { inspectionId: 'insp-001', type: 'hse-inspection' },
    },
    {
      action: 'INSPECTION_SUBMITTED',
      performedBy: 'inspector',
      performedByName: 'Inspector Demo',
      timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      details: { inspectionId: 'insp-001', type: 'hse-inspection' },
    },
  ];

  storage.save('auditLogs', auditLogs);

  // Initialize security events
  const securityEvents = [
    {
      id: 'sec-001',
      type: 'update' as const,
      severity: 'low' as const,
      title: 'System Update Completed',
      description: 'RBAC system initialized successfully',
      timestamp: new Date().toISOString(),
      resolved: true,
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'System',
    },
    {
      id: 'sec-002',
      type: 'access_violation' as const,
      severity: 'medium' as const,
      title: 'Unauthorized Access Attempt',
      description: 'Failed login attempt with incorrect PIN',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      ipAddress: '192.168.1.100',
      resolved: false,
    },
  ];

  storage.save('securityEvents', securityEvents);

  // Initialize notifications
  const notifications = [
    {
      id: 'notif-001',
      title: 'Monthly HSE Inspection Due',
      message: 'Please complete your monthly HSE inspection by the end of this week.',
      type: 'reminder' as const,
      recipientRole: 'inspector',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
      priority: 'high' as const,
    },
    {
      id: 'notif-002',
      title: 'Fire Extinguisher Service Due',
      message: 'Fire extinguisher FE-2024-001 requires servicing.',
      type: 'alert' as const,
      recipientRole: 'inspector',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      read: false,
      priority: 'medium' as const,
    },
  ];

  storage.save('notifications', notifications);

  // Initialize form templates (for admin form builder)
  const formTemplates = [
    {
      id: 'template-001',
      name: 'Monthly HSE Inspection',
      description: 'Standard monthly health, safety, and environment inspection',
      formType: 'hse-inspection',
      categories: [
        {
          id: 'cat-001',
          name: 'Safety Equipment',
          items: [
            { id: 'item-001', label: 'Fire Extinguisher', required: true },
            { id: 'item-002', label: 'Emergency Exit Signs', required: true },
            { id: 'item-003', label: 'First Aid Items', required: true },
          ],
        },
        {
          id: 'cat-002',
          name: 'Housekeeping',
          items: [
            { id: 'item-004', label: 'Floor Cleanliness', required: true },
            { id: 'item-005', label: 'Waste Disposal', required: true },
          ],
        },
      ],
      createdBy: 'admin',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      active: true,
    },
  ];

  storage.save('formTemplates', formTemplates);

  // Mark demo data as initialized
  storage.save('demoDataInitialized', true);

  console.log('Demo data initialized successfully!');
}

export function resetDemoData() {
  storage.save('demoDataInitialized', false);
  storage.save('inspections', []);
  storage.save('auditLogs', []);
  storage.save('securityEvents', []);
  storage.save('notifications', []);
  storage.save('formTemplates', []);
  console.log('Demo data reset!');
}
