// lib/checkoutHelpers.js
import prisma from '@/lib/prisma';

/**
 * Re-resolves cart items server-side against the DB (never trusts client
 * prices for catalog items) and computes totals.
 */
export async function resolveCartItems(branchId, items) {
  const resolved = [];

  for (const item of items) {
    if (item.itemType === 'MEMBERSHIP_PLAN') {
      const plan = await prisma.membershipPlan.findFirst({
        where: { id: item.refId, branchId, status: 'ACTIVE' },
      });
      if (!plan) throw new Error(`Membership plan not found or inactive`);
      resolved.push({
        itemType: 'MEMBERSHIP_PLAN',
        membershipPlanId: plan.id,
        name: plan.name,
        price: plan.price,
        quantity: 1,
      });
    } else if (item.itemType === 'PT_PACKAGE') {
      const pkg = await prisma.pTPackage.findFirst({
        where: { id: item.refId, branchId, isActive: true },
      });
      if (!pkg) throw new Error(`PT package not found or inactive`);
      resolved.push({
        itemType: 'PT_PACKAGE',
        ptPackageId: pkg.id,
        name: pkg.name,
        price: pkg.price,
        quantity: item.quantity && item.quantity > 0 ? item.quantity : 1,
      });
    } else if (item.itemType === 'SUPPLEMENT') {
      if (!item.name || !item.price) throw new Error('Supplement items need a name and price');
      resolved.push({
        itemType: 'SUPPLEMENT',
        name: item.name,
        price: Number(item.price),
        quantity: item.quantity && item.quantity > 0 ? Number(item.quantity) : 1,
      });
    } else {
      throw new Error(`Unknown item type: ${item.itemType}`);
    }
  }

  return resolved;
}

export async function applyCoupon(couponCode, memberId, subtotal) {
  if (!couponCode) return { couponDiscount: 0, couponCode: null };

  const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
  if (!coupon) throw new Error('Invalid coupon code');
  if (coupon.expiresAt < new Date()) throw new Error('Coupon has expired');

  if (coupon.forNewMember) {
    const priorOrders = await prisma.order.count({ where: { memberId, isPaid: true } });
    if (priorOrders > 0) throw new Error('This coupon is only valid for new members');
  }

  const couponDiscount = Math.min(subtotal, round2((subtotal * coupon.discount) / 100));
  return { couponDiscount, couponCode: coupon.code };
}

/**
 * Creates/extends Membership rows for every MEMBERSHIP_PLAN item in a paid order.
 * If the member already has an active, unexpired membership, the new plan
 * stacks on top (starts when the current one would expire) rather than
 * overlapping. Different plans are not merged — each purchase creates its
 * own Membership row.
 */
export async function activateMembershipsForOrder(tx, { branchId, memberId }, orderItems) {
  const planItems = orderItems.filter(
    (i) => i.itemType === 'MEMBERSHIP_PLAN' && i.membershipPlanId
  );

  for (const item of planItems) {
    const plan = await tx.membershipPlan.findUnique({ where: { id: item.membershipPlanId } });
    if (!plan) continue;

    const existingActive = await tx.membership.findFirst({
      where: { memberId, status: 'ACTIVE', expiryDate: { gte: new Date() } },
      orderBy: { expiryDate: 'desc' },
    });

    const startDate = existingActive ? existingActive.expiryDate : new Date();
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

    await tx.membership.create({
      data: { memberId, planId: plan.id, branchId, startDate, expiryDate, status: 'ACTIVE' },
    });
  }
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
