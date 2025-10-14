'use client';

import AdvancedAnalytics from '@/components/AdvancedAnalytics';

interface Object {
  id: string;
  name: string;
  address: string;
}

interface AnalyticsClientPageProps {
  objects: Object[];
  userRole: 'ADMIN' | 'DEPUTY' | 'MANAGER' | 'CLIENT';
  userId: string;
}

export default function AnalyticsClientPage({ objects, userRole, userId }: AnalyticsClientPageProps) {
  return <AdvancedAnalytics userRole={userRole} userId={userId} />;
}
