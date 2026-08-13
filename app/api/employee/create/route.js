// app/api/employee/create/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { auth } from '@clerk/nextjs/server';
import authBranchOwner from '@/middlewares/authBranchOwner';
import { PERMISSIONS } from '@/middlewares/authEmployee';

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const branchId = await authBranchOwner(userId);
    if (!branchId)
      return NextResponse.json(
        { error: 'Only branch owners can create receptionists' },
        { status: 403 }
      );

    const { name, email, password, permissions = {} } = await request.json();

    if (!name || !email || !password)
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });

    if (password.length < 6)
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );

    const existing = await prisma.employee.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 400 });

    const validKeys = Object.values(PERMISSIONS);
    const sanitizedPermissions = {};
    for (const key of validKeys) sanitizedPermissions[key] = permissions[key] === true;

    const hashedPassword = await bcrypt.hash(password, 10);

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        password: hashedPassword,
        branchId,
        permissions: sanitizedPermissions,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        branchId: true,
      },
    });

    return NextResponse.json(
      { message: 'Receptionist created successfully', employee },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/employee/create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
