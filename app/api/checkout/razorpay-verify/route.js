// app/api/checkout/razorpay-verify/route.js
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { activateMembershipsForOrder } from '@/lib/checkoutHelpers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.COLLECT_PAYMENT);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      await request.json();
    if (!orderId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing payment verification fields' }, { status: 400 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Payment verification failed — signature mismatch' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, branchId },
      include: { orderItems: true },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.isPaid) return NextResponse.json({ message: 'Order already confirmed', order });

    const updated = await prisma.$transaction(
      async (tx) => {
        const updatedOrder = await tx.order.update({
          where: { id: orderId },
          data: { isPaid: true, status: 'CONFIRMED', paymentRef: razorpay_payment_id },
        });

        await tx.orderTimeline.create({
          data: {
            orderId,
            status: 'CONFIRMED',
            changedBy: access.isOwner ? 'owner' : access.employee.employeeId,
            note: 'Payment verified via Razorpay',
          },
        });

        await activateMembershipsForOrder(
          tx,
          { branchId, memberId: order.memberId },
          order.orderItems
        );

        return updatedOrder;
      },
      { maxWait: 10000, timeout: 15000 }
    );

    return NextResponse.json({ message: 'Payment verified, order confirmed', order: updated });
  } catch (error) {
    console.error('POST /api/checkout/razorpay-verify error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
