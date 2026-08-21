// lib/attendanceHelpers.js
import prisma from '@/lib/prisma';

const DUPLICATE_SCAN_WINDOW_MS = 2 * 60 * 1000; // 2 minutes — biometric devices only

/**
 * Core check-in/check-out logic shared by the device webhook and manual entry.
 *
 * - MANUAL (staff-initiated): deliberate action, no duplicate suppression.
 *   Open record today with no checkOut → this is a check-out.
 *   No open record → this is a fresh check-in.
 * - BIOMETRIC (device push): same rule, but an open record from within the
 *   last DUPLICATE_SCAN_WINDOW_MS is ignored as an accidental re-scan rather
 *   than treated as a check-out.
 *
 * A member can have multiple check-in/out pairs (rows) per day — checking
 * out never blocks a later fresh check-in the same day.
 */
export async function recordAttendanceEvent({
  memberId,
  branchId,
  method,
  deviceUserId = null,
  deviceSerial = null,
  timestamp = new Date(),
}) {
  const todayStart = new Date(timestamp);
  todayStart.setHours(0, 0, 0, 0);

  const openRecord = await prisma.attendance.findFirst({
    where: { memberId, checkIn: { gte: todayStart }, checkOut: null },
    orderBy: { checkIn: 'desc' },
  });

  const activeMembership = await prisma.membership.findFirst({
    where: { memberId, status: 'ACTIVE', expiryDate: { gte: timestamp } },
  });
  const verified = !!activeMembership;

  if (openRecord) {
    if (method === 'BIOMETRIC') {
      const msSinceCheckIn = timestamp.getTime() - new Date(openRecord.checkIn).getTime();
      if (msSinceCheckIn < DUPLICATE_SCAN_WINDOW_MS) {
        return { record: openRecord, action: 'duplicate_ignored', verified };
      }
    }
    const closed = await prisma.attendance.update({
      where: { id: openRecord.id },
      data: { checkOut: timestamp },
    });
    return { record: closed, action: 'checked_out', verified };
  }

  const created = await prisma.attendance.create({
    data: {
      memberId,
      branchId,
      checkIn: timestamp,
      method,
      deviceUserId,
      deviceSerial,
      verified,
    },
  });
  return { record: created, action: 'checked_in', verified };
}
