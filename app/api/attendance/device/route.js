// app/api/attendance/device/route.js
import prisma from '@/lib/prisma';
import { recordAttendanceEvent } from '@/lib/attendanceHelpers';
import { NextResponse } from 'next/server';

// POST /api/attendance/device
// Body: { deviceSerial, secret, deviceUserId, timestamp? }
export async function POST(request) {
  try {
    const body = await request.json();
    const { deviceSerial, secret, deviceUserId, timestamp } = body;

    if (!deviceSerial || !secret || !deviceUserId) {
      return NextResponse.json(
        { error: 'deviceSerial, secret, and deviceUserId are required' },
        { status: 400 }
      );
    }

    const device = await prisma.biometricDevice.findUnique({ where: { deviceSerial } });
    if (!device || device.secret !== secret) {
      return NextResponse.json({ error: 'Invalid device credentials' }, { status: 401 });
    }
    if (!device.isActive) {
      return NextResponse.json({ error: 'Device is deactivated' }, { status: 403 });
    }

    const member = await prisma.member.findFirst({
      where: { branchId: device.branchId, deviceUserId: String(deviceUserId) },
    });

    if (!member) {
      // No matching member — log nothing (no memberId to attach), just tell the device/integrator why
      return NextResponse.json(
        { error: `No member linked to device user ID ${deviceUserId} in this branch` },
        { status: 404 }
      );
    }

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    const result = await recordAttendanceEvent({
      memberId: member.id,
      branchId: device.branchId,
      method: 'BIOMETRIC',
      deviceUserId: String(deviceUserId),
      deviceSerial,
      timestamp: eventTime,
    });

    await prisma.biometricDevice.update({
      where: { id: device.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({
      action: result.action,
      verified: result.verified,
      memberName: member.fullName,
      message: result.verified
        ? `${result.action === 'checked_out' ? 'Check-out' : 'Check-in'} recorded for ${member.fullName}`
        : `${member.fullName}'s membership is not active — attendance logged but flagged`,
    });
  } catch (error) {
    console.error('POST /api/attendance/device error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
