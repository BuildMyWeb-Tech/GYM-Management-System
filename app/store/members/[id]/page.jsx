// app/store/members/[id]/page.jsx
'use client';
import { use } from 'react';
import MemberProfile from '@/components/members/MemberProfile';
export default function StoreMemberProfile({ params }) {
  const { id } = use(params);
  return <MemberProfile basePath="/store/members" memberId={id} />;
}
