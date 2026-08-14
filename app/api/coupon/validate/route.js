// app/api/coupon/validate/route.js
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { applyCoupon } from '@/lib/checkoutHelpers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });

    const { code, memberId, subtotal } = await request.json();
    if (!code || !memberId || subtotal === undefined) {
      return NextResponse.json(
        { error: 'code, memberId, and subtotal are required' },
        { status: 400 }
      );
    }

    const result = await applyCoupon(code, memberId, subtotal);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
