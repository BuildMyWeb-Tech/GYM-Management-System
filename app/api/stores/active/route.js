// app/api/stores/active/route.js — public endpoint, returns active branches
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/stores/active — Public endpoint
export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      where: { status: 'ACTIVE', isActive: true },
      select: { id: true, name: true, username: true, logo: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ branches });
  } catch (error) {
    console.error('GET /api/stores/active error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
