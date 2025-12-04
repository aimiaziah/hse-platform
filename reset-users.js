// Reset Users Script - Run this in browser console to add Supervisor user
// Open browser DevTools (F12), go to Console tab, and paste this entire script

const defaultUsers = [
  {
    id: '1',
    name: 'Admin User',
    pin: '1234',
    role: 'admin',
    department: 'Administration',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      // Admin permissions - ONLY User and Form Management
      canManageUsers: true,
      canManageRoles: true,
      canManageForms: true,
      canSetNotifications: false,
      canManageSystem: false,
      canBackupRestore: false,

      // Inspector permissions - View only (no creation/editing)
      canCreateInspections: false,
      canEditInspections: false,
      canViewInspections: true,
      canViewAnalytics: false,
      canViewGoogleDriveStatus: false,
      canAddDigitalSignature: false,
      canExportReports: false,

      // Supervisor permissions
      canReviewInspections: false,
      canApproveInspections: false,
      canRejectInspections: false,
      canViewPendingInspections: false,
      canExportToGoogleDrive: false,
    },
  },
  {
    id: '2',
    name: 'Inspector Demo',
    pin: '9999',
    role: 'inspector',
    department: 'Operations',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      // Admin permissions
      canManageUsers: false,
      canManageRoles: false,
      canManageForms: false,
      canSetNotifications: false,
      canManageSystem: false,
      canBackupRestore: false,

      // Inspector permissions
      canCreateInspections: true,
      canEditInspections: true,
      canViewInspections: true,
      canViewAnalytics: true,
      canViewGoogleDriveStatus: true,
      canAddDigitalSignature: true,
      canExportReports: true,

      // Supervisor permissions
      canReviewInspections: false,
      canApproveInspections: false,
      canRejectInspections: false,
      canViewPendingInspections: false,
      canExportToGoogleDrive: false,
    },
  },
  {
    id: '3',
    name: 'Supervisor User',
    pin: '5555',
    role: 'supervisor',
    department: 'Quality Assurance',
    isActive: true,
    createdAt: new Date().toISOString(),
    permissions: {
      // Admin permissions
      canManageUsers: false,
      canManageRoles: false,
      canManageForms: false,
      canSetNotifications: false,
      canManageSystem: false,
      canBackupRestore: false,

      // Inspector permissions - View only
      canCreateInspections: false,
      canEditInspections: false,
      canViewInspections: true,
      canViewAnalytics: true,
      canViewGoogleDriveStatus: true,
      canAddDigitalSignature: false,
      canExportReports: true,

      // Supervisor permissions - Full review access
      canReviewInspections: true,
      canApproveInspections: true,
      canRejectInspections: true,
      canViewPendingInspections: true,
      canExportToGoogleDrive: true,
    },
  },
];

// Update localStorage
localStorage.setItem('users', JSON.stringify(defaultUsers));
console.log('✅ Users updated successfully! Now you can login with:');
console.log('- Admin: PIN 1234');
console.log('- Inspector: PIN 9999');
console.log('- Supervisor: PIN 5555');
console.log('\nPlease refresh the page and try logging in again.');
