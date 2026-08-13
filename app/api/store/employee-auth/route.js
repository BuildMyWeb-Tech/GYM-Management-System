// app/api/store/employee-auth/route.js
import prisma from '@/lib/prisma';
import { verifyEmployeeToken } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

// GET /api/store/employee-auth — Validate employee JWT and return fresh DB data
export async function GET(request) {
  try {
    const decoded = verifyEmployeeToken(request);

    if (!decoded) {
      return NextResponse.json(
        { valid: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: decoded.employeeId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        branchId: true,
        branch: {
          select: {
            id: true,
            name: true,
            logo: true,
            username: true,
            status: true,
            isActive: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ valid: false, error: 'Account not found' }, { status: 404 });
    }

    if (!employee.isActive) {
      return NextResponse.json(
        { valid: false, error: 'Account has been deactivated' },
        { status: 403 }
      );
    }

    if (employee.branch.status !== 'ACTIVE' || !employee.branch.isActive) {
      return NextResponse.json({ valid: false, error: 'Branch is not active' }, { status: 403 });
    }

    return NextResponse.json({
      valid: true,
      employee,
      branch: employee.branch,
    });
  } catch (error) {
    console.error('GET /api/store/employee-auth error:', error);
    return NextResponse.json({ valid: false, error: error.message }, { status: 500 });
  }
}
