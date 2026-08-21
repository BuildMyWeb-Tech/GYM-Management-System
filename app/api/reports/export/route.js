// app/api/reports/export/route.js
import prisma from '@/lib/prisma';
import { resolveReportAccess } from '@/lib/reportAccess';
import { NextResponse } from 'next/server';
import { buildDateRange, round2, EXCLUDED_STATUSES } from '@/lib/reportUtils';

function toCSV(rows, columns) {
  const header = columns.map((c) => `"${c.label}"`).join(',');
  const body = rows.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key] ?? '';
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      })
      .join(',')
  );
  return [header, ...body].join('\n');
}

export async function GET(request) {
  try {
    const { role, branchId: myBranchId } = await resolveReportAccess(request);
    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'orders';
    const format = searchParams.get('format') || 'csv';
    const period = searchParams.get('period') || 'month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const filterBranch = searchParams.get('branchId');

    const dateRange = buildDateRange(period, from, to);
    if (!dateRange)
      return NextResponse.json(
        { error: 'Custom period requires valid "from" and "to" dates' },
        { status: 400 }
      );

    const scopedBranchId = role === 'ADMIN' ? filterBranch || undefined : myBranchId;

    let branchInfo = null;
    if (scopedBranchId) {
      branchInfo = await prisma.branch.findUnique({
        where: { id: scopedBranchId },
        select: { name: true, address: true, phone: true },
      });
    }

    if (type === 'attendance') {
      const records = await prisma.attendance.findMany({
        where: { checkIn: dateRange, ...(scopedBranchId ? { branchId: scopedBranchId } : {}) },
        include: { member: { select: { fullName: true, phone: true } } },
        orderBy: { checkIn: 'desc' },
        take: 10000,
      });

      const rows = records.map((r) => ({
        memberName: r.member.fullName,
        phone: r.member.phone,
        checkIn: r.checkIn.toISOString(),
        checkOut: r.checkOut ? r.checkOut.toISOString() : '',
        method: r.method,
        verified: r.verified ? 'Yes' : 'No',
      }));

      const columns = [
        { key: 'memberName', label: 'Member' },
        { key: 'phone', label: 'Phone' },
        { key: 'checkIn', label: 'Check-in' },
        { key: 'checkOut', label: 'Check-out' },
        { key: 'method', label: 'Method' },
        { key: 'verified', label: 'Membership Active' },
      ];

      if (format === 'csv') {
        return new Response(toCSV(rows, columns), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="attendance-report-${period}-${Date.now()}.csv"`,
          },
        });
      }
      return NextResponse.json({
        format: 'pdf',
        type: 'attendance',
        branch: branchInfo,
        period,
        rows,
        columns,
        generatedAt: new Date().toISOString(),
      });
    }

    const orders = await prisma.order.findMany({
      where: {
        createdAt: dateRange,
        status: { notIn: EXCLUDED_STATUSES },
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      include: {
        branch: { select: { name: true, username: true } },
        member: { select: { fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const rows = orders.map((o) => ({
      id: o.id,
      branchName: o.branch?.name || '',
      memberName: o.member?.fullName || '',
      memberPhone: o.member?.phone || '',
      subtotal: round2(o.subtotal),
      couponDiscount: round2(o.couponDiscount),
      commissionAmt: round2(o.commissionAmt),
      total: round2(o.total),
      status: o.status,
      paymentMethod: o.paymentMethod,
      date: o.createdAt.toISOString().split('T')[0],
      time: o.createdAt.toTimeString().split(' ')[0],
    }));

    const columns = [
      { key: 'id', label: 'Order ID' },
      { key: 'branchName', label: 'Branch' },
      { key: 'memberName', label: 'Member' },
      { key: 'memberPhone', label: 'Phone' },
      { key: 'subtotal', label: 'Subtotal (₹)' },
      { key: 'couponDiscount', label: 'Discount (₹)' },
      { key: 'commissionAmt', label: 'Commission (₹)' },
      { key: 'total', label: 'Total (₹)' },
      { key: 'status', label: 'Status' },
      { key: 'paymentMethod', label: 'Payment' },
      { key: 'date', label: 'Date' },
      { key: 'time', label: 'Time' },
    ];

    if (format === 'csv') {
      return new Response(toCSV(rows, columns), {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="revenue-report-${period}-${Date.now()}.csv"`,
        },
      });
    }

    const totalRevenue = round2(rows.reduce((s, r) => s + r.total, 0));
    const totalCommission = round2(rows.reduce((s, r) => s + r.commissionAmt, 0));

    return NextResponse.json({
      format: 'pdf',
      type: 'revenue',
      branch: branchInfo,
      summary: {
        totalRevenue,
        totalCommission,
        branchRevenue: round2(totalRevenue - totalCommission),
        totalOrders: rows.length,
        aov: rows.length > 0 ? round2(totalRevenue / rows.length) : 0,
        period,
        generatedAt: new Date().toISOString(),
      },
      rows,
      columns,
    });
  } catch (error) {
    console.error('GET /api/reports/export error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
