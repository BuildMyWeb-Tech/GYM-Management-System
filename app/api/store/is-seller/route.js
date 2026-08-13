// app/api/store/is-seller/route.js — verifies branch owner status
import prisma from '@/lib/prisma';
import authBranchOwner from '@/middlewares/authBranchOwner';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// GET /api/store/is-seller — Verify branch owner status
export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    if (!userId) return NextResponse.json({ isBranchOwner: false }, { status: 401 });

    const branchId = await authBranchOwner(userId);
    if (!branchId) return NextResponse.json({ isBranchOwner: false });

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { commission: true },
    });

    return NextResponse.json({ isBranchOwner: true, branch });
  } catch (error) {
    console.error('GET /api/store/is-seller error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
