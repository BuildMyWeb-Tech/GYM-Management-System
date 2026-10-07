// lib/checkoutHelpers.js
import prisma from '@/lib/prisma';

/**
 * Re-resolves cart items server-side against the DB (never trusts client
 * prices for catalog items) and computes totals.
 */
export async function resolveCartItems(branchId, items) {
  // Batch-fetch all catalog items in two queries instead of one per item
  const planIds = items.filter((i) => i.itemType === 'MEMBERSHIP_PLAN').map((i) => i.refId);
  const pkgIds  = items.filter((i) => i.itemType === 'PT_PACKAGE').map((i) => i.refId);

  const [plans, pkgs] = await Promise.all([
    planIds.length
      ? prisma.membershipPlan.findMany({ where: { id: { in: planIds }, branchId, status: 'ACTIVE' } })
      : [],
    pkgIds.length
      ? prisma.pTPackage.findMany({ where: { id: { in: pkgIds }, branchId, isActive: true } })
      : [],
  ]);

  const planMap = Object.fromEntries(plans.map((p) => [p.id, p]));
  const pkgMap  = Object.fromEntries(pkgs.map((p) => [p.id, p]));

  const resolved = [];
  for (const item of items) {
    if (item.itemType === 'MEMBERSHIP_PLAN') {
      const plan = planMap[item.refId];
      if (!plan) throw new Error(`Membership plan not found or inactive`);
      resolved.push({ itemType: 'MEMBERSHIP_PLAN', membershipPlanId: plan.id, name: plan.name, price: plan.price, quantity: 1 });
    } else if (item.itemType === 'PT_PACKAGE') {
      const pkg = pkgMap[item.refId];
      if (!pkg) throw new Error(`PT package not found or inactive`);
      resolved.push({ itemType: 'PT_PACKAGE', ptPackageId: pkg.id, name: pkg.name, price: pkg.price, quantity: item.quantity && item.quantity > 0 ? item.quantity : 1 });
    } else if (item.itemType === 'SUPPLEMENT') {
      if (!item.name || !item.price) throw new Error('Supplement items need a name and price');
      resolved.push({ itemType: 'SUPPLEMENT', name: item.name, price: Number(item.price), quantity: item.quantity && item.quantity > 0 ? Number(item.quantity) : 1 });
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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Creates/extends Membership rows for every MEMBERSHIP_PLAN item in a paid order.
 * Smart renewal date logic — three scenarios:
 *
 * 1. Early Payment (active unexpired membership exists):
 *    New plan starts from the current plan's expiry date (seamless continuation).
 *    e.g. plan expires Day 30, paid on Day 25 → new plan starts Day 31.
 *
 * 2. Late Payment + Attendance (plan expired, member attended unpaid):
 *    Unverified attendance records already capture the gap (verified=false).
 *    New plan starts from today (payment date).
 *    e.g. plan expired Day 30, attended Days 31–32, paid Day 33 → starts Day 33.
 *
 * 3. Late Payment + No Attendance:
 *    Gap days are ignored. New plan starts from today (payment date).
 *    e.g. plan expired Day 30, paid Day 41 → starts Day 41.
 *
 * Multiple plans in the same cart are stacked sequentially.
 * Expired ACTIVE memberships are cleaned up and Member.status is set to ACTIVE.
 */
export async function activateMembershipsForOrder(tx, { branchId, memberId }, orderItems) {
  const planItems = orderItems.filter(
    (i) => i.itemType === 'MEMBERSHIP_PLAN' && i.membershipPlanId
  );
  if (planItems.length === 0) return;

  const today = startOfDay(new Date());

  // Mark any stale ACTIVE memberships that have already lapsed as EXPIRED
  await tx.membership.updateMany({
    where: { memberId, status: 'ACTIVE', expiryDate: { lt: today } },
    data: { status: 'EXPIRED' },
  });

  // Find the furthest-expiring active membership to use as the start anchor
  let anchor = await tx.membership.findFirst({
    where: { memberId, status: 'ACTIVE', expiryDate: { gte: today } },
    orderBy: { expiryDate: 'desc' },
  });

  // Batch-fetch all plan durations in one query instead of one per item
  const planIds = planItems.map((i) => i.membershipPlanId);
  const planRecords = await tx.membershipPlan.findMany({
    where: { id: { in: planIds } },
    select: { id: true, durationDays: true },
  });
  const planDurationMap = Object.fromEntries(planRecords.map((p) => [p.id, p.durationDays]));

  for (const item of planItems) {
    const durationDays = planDurationMap[item.membershipPlanId];
    if (durationDays == null) continue;

    const startDate = anchor ? startOfDay(anchor.expiryDate) : today;
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + durationDays);

    const created = await tx.membership.create({
      data: { memberId, planId: item.membershipPlanId, branchId, startDate, expiryDate, status: 'ACTIVE' },
    });

    anchor = created;
  }

  // Ensure the member is ACTIVE after a successful payment
  await tx.member.update({
    where: { id: memberId },
    data: { status: 'ACTIVE' },
  });
}

export function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
