// app/api/checkout/create/route.js
import prisma from '@/lib/prisma';
import razorpay from '@/lib/razorpay';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import {
  resolveCartItems,
  applyCoupon,
  activateMembershipsForOrder,
  round2,
} from '@/lib/checkoutHelpers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { memberId, items, couponCode, paymentMethod } = await request.json();

    if (!memberId || !Array.isArray(items) || items.length === 0 || !paymentMethod) {
      return NextResponse.json(
        { error: 'memberId, items, and paymentMethod are required' },
        { status: 400 }
      );
    }
    if (!['CASH', 'UPI', 'CARD', 'RAZORPAY'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const member = await prisma.member.findFirst({ where: { id: memberId, branchId } });
    if (!member)
      return NextResponse.json({ error: 'Member not found in this branch' }, { status: 404 });

    const resolvedItems = await resolveCartItems(branchId, items);
    const subtotal = round2(resolvedItems.reduce((s, i) => s + i.price * i.quantity, 0));

    const { couponDiscount, couponCode: appliedCode } = await applyCoupon(
      couponCode,
      memberId,
      subtotal
    );
    const total = round2(subtotal - couponDiscount);

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { commission: true },
    });
    const commissionAmt = round2((total * (branch?.commission?.percentage || 0)) / 100);

    const isImmediate = paymentMethod !== 'RAZORPAY';

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          memberId,
          branchId,
          subtotal,
          commissionAmt,
          total,
          status: isImmediate ? 'CONFIRMED' : 'PENDING',
          isPaid: isImmediate,
          paymentMethod,
          isCouponUsed: !!appliedCode,
          couponCode: appliedCode,
          couponDiscount,
          orderItems: { create: resolvedItems },
        },
        include: { orderItems: true },
      });

      await tx.orderTimeline.create({
        data: {
          orderId: createdOrder.id,
          status: createdOrder.status,
          changedBy: access.isOwner ? 'owner' : access.employee.employeeId,
          note: isImmediate ? `Paid via ${paymentMethod}` : 'Awaiting online payment',
        },
      });

      if (isImmediate) {
        await activateMembershipsForOrder(tx, { branchId, memberId }, createdOrder.orderItems);
      }

      return createdOrder;
    });

    if (isImmediate) {
      return NextResponse.json(
        { message: 'Order completed', order, requiresPayment: false },
        { status: 201 }
      );
    }

    // RAZORPAY — create the razorpay order and hand it to the frontend to open the widget
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100), // paise
      currency: 'INR',
      receipt: order.id,
    });

    return NextResponse.json(
      {
        message: 'Order created, awaiting payment',
        order,
        requiresPayment: true,
        razorpay: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          keyId: process.env.RAZORPAY_KEY_ID,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/checkout/create error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
