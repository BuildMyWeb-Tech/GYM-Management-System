// app/employee/members/[id]/page.jsx
'use client';
import { use } from 'react';
import MemberProfile from '@/components/members/MemberProfile';
export default function EmployeeMemberProfile({ params }) {
  const { id } = use(params);
  return <MemberProfile basePath="/employee/members" memberId={id} />;
}
