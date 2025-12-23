// src/components/UserAvatar.tsx - Reusable User Avatar Component
import React from 'react';

interface UserAvatarProps {
  user: {
    name: string;
    profilePicture?: string | null;
    role?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showBorder?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  // Size mappings
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-7 w-7',
  };

  // Soft pastel colors based on name hash - variety of colors but muted/soft tones
  const getMicrosoftStyleColor = () => {
    // Hash the user's name to get a consistent color
    const colors = [
      'bg-[#A8C7E7]', // Soft Blue
      'bg-[#B8D8BA]', // Soft Green
      'bg-[#D4B5D4]', // Soft Purple/Lavender
      'bg-[#F4C2A8]', // Soft Peach
      'bg-[#F5B6C8]', // Soft Pink
      'bg-[#A8D5D5]', // Soft Teal
      'bg-[#E5B8B8]', // Soft Rose
      'bg-[#B8C5E5]', // Soft Periwinkle
      'bg-[#FFD6A5]', // Soft Orange
      'bg-[#B8E5E5]', // Soft Cyan
      'bg-[#E5D4B8]', // Soft Gold
      'bg-[#D5C5E5]', // Soft Violet
    ];

    // Simple hash function to get consistent color for same name
    let hash = 0;
    for (let i = 0; i < user.name.length; i++) {
      hash = user.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  // Role-based solid colors for icon backgrounds
  const getRoleSolidColor = () => {
    switch (user.role) {
      case 'admin':
        return 'bg-purple-50 text-purple-600';
      case 'supervisor':
        return 'bg-green-50 text-green-600';
      case 'inspector':
        return 'bg-blue-50 text-blue-600';
      case 'employee':
        return 'bg-orange-50 text-orange-600';
      default:
        return 'bg-blue-50 text-blue-600';
    }
  };

  const borderClass = showBorder ? 'border-2 border-gray-200' : '';
  const baseClasses = `${sizeClasses[size]} rounded-full flex-shrink-0 object-cover ${borderClass} ${className}`;

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[UserAvatar] Debug:', {
      hasProfilePicture: !!user.profilePicture,
      profilePictureLength: user.profilePicture?.length,
      userName: user.name,
    });
  }

  // If user has a profile picture, display it
  if (user.profilePicture) {
    return (
      <img
        src={user.profilePicture}
        alt={user.name}
        className={baseClasses}
        onError={(e) => {
          console.error(
            '[UserAvatar] Failed to load profile picture:',
            user.profilePicture?.substring(0, 50),
          );
        }}
      />
    );
  }

  // Fallback to Microsoft-style gradient avatar with user's initials
  const getInitials = () => {
    const names = user.name.trim().split(' ');
    if (names.length >= 2) {
      // First and last name initials
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
    // Single name - just first letter
    return user.name.charAt(0).toUpperCase();
  };

  return (
    <div
      className={`${baseClasses} ${getMicrosoftStyleColor()} flex items-center justify-center text-gray-800 font-semibold`}
    >
      {getInitials()}
    </div>
  );
};

// Alternative version that shows initials (same as UserAvatar but can be styled differently)
export const UserAvatarIcon: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showBorder = false,
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-11 h-11 text-base',
  };

  // Soft pastel colors based on name hash - variety of colors but muted/soft tones
  const getMicrosoftStyleColor = () => {
    const colors = [
      'bg-[#A8C7E7]', // Soft Blue
      'bg-[#B8D8BA]', // Soft Green
      'bg-[#D4B5D4]', // Soft Purple/Lavender
      'bg-[#F4C2A8]', // Soft Peach
      'bg-[#F5B6C8]', // Soft Pink
      'bg-[#A8D5D5]', // Soft Teal
      'bg-[#E5B8B8]', // Soft Rose
      'bg-[#B8C5E5]', // Soft Periwinkle
      'bg-[#FFD6A5]', // Soft Orange
      'bg-[#B8E5E5]', // Soft Cyan
      'bg-[#E5D4B8]', // Soft Gold
      'bg-[#D5C5E5]', // Soft Violet
    ];

    let hash = 0;
    for (let i = 0; i < user.name.length; i++) {
      hash = user.name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  const borderClass = showBorder ? 'border-2 border-gray-200' : '';

  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[UserAvatarIcon] Debug:', {
      hasProfilePicture: !!user.profilePicture,
      profilePictureLength: user.profilePicture?.length,
      userName: user.name,
    });
  }

  // If user has a profile picture, display it
  if (user.profilePicture) {
    return (
      <img
        src={user.profilePicture}
        alt={user.name}
        className={`${sizeClasses[size]} rounded-full flex-shrink-0 object-cover ${borderClass} ${className}`}
        onError={(e) => {
          console.error(
            '[UserAvatarIcon] Failed to load profile picture:',
            user.profilePicture?.substring(0, 50),
          );
        }}
      />
    );
  }

  // Fallback to Microsoft-style initials avatar
  const getInitials = () => {
    const names = user.name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
    return user.name.charAt(0).toUpperCase();
  };

  return (
    <div
      className={`${
        sizeClasses[size]
      } rounded-full flex items-center justify-center ${getMicrosoftStyleColor()} text-gray-800 font-semibold ${borderClass} ${className}`}
    >
      {getInitials()}
    </div>
  );
};

export default UserAvatar;
