// app/api/member/create/route.js
import prisma from '@/lib/prisma';
import { resolveBranchAccess } from '@/lib/resolveBranchAccess';
import { PERMISSIONS } from '@/middlewares/authEmployee';
import { NextResponse } from 'next/server';

function last5Digits(phone) {
  const digits = (phone || '').replace(/\D/g, '');
  return digits.slice(-5);
}

export async function POST(request) {
  try {
    const access = await resolveBranchAccess(request, PERMISSIONS.MANAGE_MEMBERS);
    if (access.error) return NextResponse.json({ error: access.error }, { status: access.status });
    const { branchId } = access;

    const body = await request.json();
    const {
      fullName, phone, dob, gender, address,
      emergencyContactName, emergencyContactNumber, deviceUserId,
      memberCode, planIds, fromDate,
    } = body;

    if (!fullName || !phone || !emergencyContactName || !emergencyContactNumber) {
      return NextResponse.json(
        { error: 'Full name, phone, and emergency contact are required' },
        { status: 400 }
      );
    }

    const finalMemberCode = (memberCode || '').trim() || last5Digits(phone);
    const startDate = fromDate ? new Date(fromDate) : new Date();

    // Validate selected plans belong to this branch, and pull real durations/prices server-side
    let plans = [];
    if (Array.isArray(planIds) && planIds.length > 0) {
      plans = await prisma.membershipPlan.findMany({
        where: { id: { in: planIds }, branchId, status: 'ACTIVE' },
      });
      if (plans.length !== planIds.length) {
        return NextResponse.json({ error: 'One or more selected plans are invalid or inactive' }, { status: 400 });
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      const created = await tx.member.create({
        data: {
          branchId,
          memberCode: finalMemberCode || null,
          fullName,
          phone,
          dob: dob ? new Date(dob) : null,
          gender: gender || null,
          address: address || null,
          emergencyContactName,
          emergencyContactNumber,
          deviceUserId: deviceUserId || null,
          status: 'ACTIVE',
        },
      });

      for (const plan of plans) {
        const expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + plan.durationDays);

        await tx.membership.create({
          data: {
            memberId: created.id,
            planId: plan.id,
            branchId,
            startDate,
            expiryDate,
            status: 'ACTIVE',
          },
        });
      }

      return created;
    });

    return NextResponse.json({ message: 'Member registered successfully', member }, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') {
      const target = error.meta?.target || [];
      if (target.includes('memberCode')) {
        return NextResponse.json({ error: 'That Member ID is already in use in this branch — enter a different one' }, { status: 400 });
      }
      return NextResponse.json({ error: 'That biometric device ID is already assigned to another member in this branch' }, { status: 400 });
    }
    console.error('POST /api/member/create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}