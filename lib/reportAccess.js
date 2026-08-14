// lib/reportAccess.js
import authAdmin from '@/middlewares/authAdmin';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { getAuth } from '@clerk/nextjs/server';
import { PERMISSIONS } from '@/middlewares/authEmployee';

export async function resolveReportAccess(request) {
  const { userId } = getAuth(request);
  if (userId) {
    const isAdminUser = await authAdmin(userId);
    if (isAdminUser) return { role: 'ADMIN', branchId: null };
  }

  const branchAccess = await resolveBranchAccess(request, PERMISSIONS.VIEW_REPORTS);
  if (branchAccess.error) return { role: null, branchId: null };

  return { role: 'BRANCH', branchId: branchAccess.branchId };
}
