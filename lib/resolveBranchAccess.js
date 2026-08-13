// lib/resolveBranchAccess.js
import authBranchOwner from '@/middlewares/authBranchOwner';
import verifyEmployeeToken, { hasPermission } from '@/middlewares/authEmployee';
import { getAuth } from '@clerk/nextjs/server';

/**
 * Resolves branch access for either a Clerk-authenticated branch owner
 * or a JWT-authenticated employee (receptionist).
 *
 * @param {Request} request
 * @param {string|null} requiredPermission - PERMISSIONS.* key, or null if any authenticated branch member can proceed
 * @returns {{ branchId: string|null, employee: object|null, isOwner: boolean, error?: string, status?: number }}
 */
export async function resolveBranchAccess(request, requiredPermission = null) {
  const employee = verifyEmployeeToken(request);
  if (employee) {
    if (requiredPermission && !hasPermission(employee, requiredPermission)) {
      return {
        branchId: null,
        employee: null,
        isOwner: false,
        error: 'Permission denied',
        status: 403,
      };
    }
    return { branchId: employee.branchId, employee, isOwner: false };
  }

  const { userId } = getAuth(request);
  if (!userId) {
    return {
      branchId: null,
      employee: null,
      isOwner: false,
      error: 'Not authenticated',
      status: 401,
    };
  }

  const branchId = await authBranchOwner(userId);
  if (!branchId) {
    return {
      branchId: null,
      employee: null,
      isOwner: false,
      error: 'Not a branch owner',
      status: 403,
    };
  }

  return { branchId, employee: null, isOwner: true };
}
