// src/components/MobileHeader.tsx - Clean Mobile Header
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

interface MobileHeaderProps {
  title?: string;
  showLogo?: boolean;
  showUserInfo?: boolean;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  title = '',
  showLogo = true,
  showUserInfo = false,
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
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - User Info and Profile Link */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                {/* Profile Link */}
                {(user.role === 'inspector' || user.role === 'supervisor') && (
                  <Link
                    href={getProfileLink()}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0"
                    title="Go to Profile"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </Link>
                )}

                {/* User Name and Role */}
                <div className="flex flex-col justify-center mt-1">
                  <p className="text-sm font-semibold text-gray-900 leading-tight mb-0">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-600 capitalize font-medium leading-tight">
                    {user.role}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Logo */}
          {showLogo && (
            <Link href="/" className="flex items-center flex-shrink-0">
              <div className="w-14 h-14 rounded-lg overflow-hidden flex items-center justify-center">
                <Image
                  src="/theta-logo.png"
                  alt="Logo"
                  width={56}
                  height={56}
                  className="object-contain w-full h-full"
                />
              </div>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
