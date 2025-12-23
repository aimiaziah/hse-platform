// src/components/MobileHeader.tsx - Clean Mobile Header
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { UserAvatarIcon } from '@/components/UserAvatar';
import NotificationBell from '@/components/NotificationBell';

interface MobileHeaderProps {
  title?: string;
  showLogo?: boolean;
  showUserInfo?: boolean;
  showNotificationForEmployee?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = '',
  showLogo = true,
  showUserInfo = false,
  showNotificationForEmployee = false,
}) => {
  const { user } = useAuth();

  // Get profile link based on role
  const getProfileLink = () => {
    if (user?.role === 'supervisor') return '/supervisor/profile';
    if (user?.role === 'inspector') return '/inspector/profile';
    return '/';
  };

  return (
    <header className="sticky top-0 bg-white border-b border-gray-200 shadow-sm z-40">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Logo */}
          {showLogo && (
            <Link href="/" className="flex items-center flex-shrink-0">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center">
                <Image
                  src="/theta-logo.png"
                  alt="Theta Logo"
                  width={56}
                  height={56}
                  className="object-contain w-full h-full"
                  priority
                />
              </div>
            </Link>
          )}

          {/* Right side - Notification Bell for Employee or User Info and Profile Link */}
          <div className="flex items-center gap-3">
            {user && user.role === 'employee' && showNotificationForEmployee ? (
              <NotificationBell />
            ) : (
              user &&
              user.role !== 'employee' && (
                <>
                  {/* User Name and Role */}
                  <div className="text-right space-y-0">
                    <p className="text-sm font-semibold text-gray-900 leading-none mt-1 mb-0">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-600 capitalize font-normal leading-none -mt-0.5">
                      {user.role}
                    </p>
                  </div>

                  {/* Profile Icon */}
                  {(user.role === 'inspector' || user.role === 'supervisor') && (
                    <Link
                      href={getProfileLink()}
                      className="hover:opacity-80 transition-opacity"
                      title="Go to Profile"
                    >
                      <UserAvatarIcon user={user} size="lg" />
                    </Link>
                  )}
                </>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
