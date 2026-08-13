// app/employee/members/[id]/edit/page.jsx
'use client';
import { use } from 'react';
import MemberForm from '@/components/members/MemberForm';
export default function EditEmployeeMember({ params }) {
  const { id } = use(params);
  return <MemberForm basePath="/employee/members" memberId={id} />;
}
