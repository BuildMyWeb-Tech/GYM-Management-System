import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'employee_jwt_secret_gym_2026';

// ── All valid permission keys (matches checkbox list in branch panel) ─────────
export const PERMISSIONS = {
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  MARK_ATTENDANCE: 'MARK_ATTENDANCE',
  COLLECT_PAYMENT: 'COLLECT_PAYMENT',
  MANAGE_MEMBERSHIPS: 'MANAGE_MEMBERSHIPS',
  VIEW_REPORTS: 'VIEW_REPORTS',
  MANAGE_BRANCH_SETTINGS: 'MANAGE_BRANCH_SETTINGS',
};

/**
 * Verifies JWT from Authorization header.
 * Returns decoded employee payload | null.
 *
 * Token payload shape:
 * {
 *   employeeId: string,
 *   branchId: string,
 *   email: string,
 *   permissions: { MANAGE_MEMBERS: true, MARK_ATTENDANCE: false, ... }
 * }
 */
export function verifyEmployeeToken(request) {
  try {
    const authHeader = request.headers.get
      ? request.headers.get('authorization') || ''
      : request.headers?.authorization || '';

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    console.error('verifyEmployeeToken error:', err.message);
    return null;
  }
}

/**
 * Checks if employee has a specific permission.
 * Owners signing in via employee route also get full access.
 */
export function hasPermission(employee, permission) {
  if (!employee) return false;
  if (employee.isOwner === true) return true;
  return employee.permissions?.[permission] === true;
}

/**
 * Verifies the employee belongs to the expected branch.
 * Prevents employees from accessing other branches' APIs.
 */
export function belongsToBranch(employee, branchId) {
  if (!employee) return false;
  return employee.branchId === branchId;
}

export const JWT_SECRET_KEY = JWT_SECRET;

export default verifyEmployeeToken;
