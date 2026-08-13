// app/api/employee/login/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET_KEY } from '@/middlewares/authEmployee';

export async function POST(request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password)
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });

    const employee = await prisma.employee.findUnique({
      where: { email },
      include: {
        branch: {
          select: { id: true, name: true, logo: true, status: true, isActive: true },
        },
      },
    });

    if (!employee) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    if (!employee.isActive)
      return NextResponse.json(
        { error: 'Your account has been deactivated. Contact your branch owner.' },
        { status: 403 }
      );

    const branch = employee.branch;
    if (!branch) return NextResponse.json({ error: 'Branch not found.' }, { status: 404 });

    if (branch.status === 'PENDING')
      return NextResponse.json({ error: 'Branch is waiting for admin approval.' }, { status: 403 });
    if (branch.status === 'REJECTED')
      return NextResponse.json(
        { error: 'Branch has been rejected. Contact admin.' },
        { status: 403 }
      );
    if (branch.status === 'INACTIVE' || !branch.isActive)
      return NextResponse.json({ error: 'Branch is currently inactive.' }, { status: 403 });
    if (branch.status !== 'ACTIVE')
      return NextResponse.json({ error: 'Branch is not active yet.' }, { status: 403 });

    const isValid = await bcrypt.compare(password, employee.password);
    if (!isValid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = jwt.sign(
      {
        employeeId: employee.id,
        branchId: employee.branchId,
        name: employee.name,
        email: employee.email,
        permissions: employee.permissions,
      },
      JWT_SECRET_KEY,
      { expiresIn: '7d' }
    );

    const { password: _, ...safeEmployee } = employee;

    return NextResponse.json({
      message: 'Login successful',
      token,
      employee: { ...safeEmployee, branch },
    });
  } catch (error) {
    console.error('POST /api/employee/login error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
