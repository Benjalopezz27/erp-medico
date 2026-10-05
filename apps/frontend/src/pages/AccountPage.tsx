import React from 'react';
import { ProfileCard } from '@/features/account/components/ProfileCard';
import { ChangePasswordCard } from '@/features/account/components/ChangePasswordCard';

export const AccountPage: React.FC = () => (
  <div className="mx-auto max-w-2xl space-y-6">
    <ProfileCard />
    <ChangePasswordCard />
  </div>
);
