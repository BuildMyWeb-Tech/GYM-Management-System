// app/store/members/[id]/edit/page.jsx
'use client';
import { use } from 'react';
import MemberForm from '@/components/members/MemberForm';
export default function EditStoreMember({ params }) {
  const { id } = use(params);
  return <MemberForm basePath="/store/members" memberId={id} />;
}
