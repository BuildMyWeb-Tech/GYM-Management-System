// lib/attendanceHelpers.js
import prisma from '@/lib/prisma';

const DUPLICATE_SCAN_WINDOW_MS = 2 * 60 * 1000; // 2 minutes — treat as accidental double-scan, not a real event

/**
 * Core check-in/check-out logic shared by the device webhook and manual entry.
 * - If the member has an open (no checkOut) attendance row from within the
 *   last DUPLICATE_SCAN_WINDOW_MS, ignore the scan as a duplicate.
 * - If the member has an open attendance row from earlier today (beyond the
 *   window), this scan is their check-out — close that row.
 * - Otherwise, this is a fresh check-in — create a new row.
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
    const msSinceCheckIn = timestamp.getTime() - new Date(openRecord.checkIn).getTime();
    if (msSinceCheckIn < DUPLICATE_SCAN_WINDOW_MS) {
      return { record: openRecord, action: 'duplicate_ignored', verified };
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
