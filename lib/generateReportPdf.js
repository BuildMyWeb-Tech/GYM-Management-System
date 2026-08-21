// lib/generateReportPdf.js
'use client';

const GREEN = [22, 163, 74];
const SLATE_DARK = [30, 41, 59];
const SLATE_LIGHT = [248, 250, 252];
const SLATE_BORDER = [226, 232, 240];
const TEXT_DARK = [30, 41, 59];
const TEXT_MUTED = [100, 116, 139];

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// Column definitions per report type — explicit widths (mm) that sum to the usable page width (~182mm)
const REVENUE_COLUMNS = [
  {
    key: 'id',
    label: 'Order ID',
    width: 22,
    align: 'left',
    fmt: (v) => truncate(v?.slice(-8)?.toUpperCase() || '', 10),
  },
  { key: 'memberName', label: 'Member', width: 30, align: 'left', fmt: (v) => truncate(v, 18) },
  { key: 'memberPhone', label: 'Phone', width: 24, align: 'left' },
  {
    key: 'total',
    label: 'Amount',
    width: 22,
    align: 'right',
    fmt: (v) => `Rs.${Number(v).toLocaleString('en-IN')}`,
  },
  { key: 'status', label: 'Status', width: 24, align: 'center' },
  { key: 'paymentMethod', label: 'Payment', width: 24, align: 'center' },
  { key: 'date', label: 'Date', width: 20, align: 'left' },
  { key: 'time', label: 'Time', width: 16, align: 'left' },
];

const ATTENDANCE_COLUMNS = [
  { key: 'memberName', label: 'Member', width: 40, align: 'left', fmt: (v) => truncate(v, 24) },
  { key: 'phone', label: 'Phone', width: 30, align: 'left' },
  {
    key: 'checkIn',
    label: 'Check-in',
    width: 38,
    align: 'left',
    fmt: (v) => `${fmtDate(v)}  ${fmtTime(v)}`,
  },
  {
    key: 'checkOut',
    label: 'Check-out',
    width: 38,
    align: 'left',
    fmt: (v) => (v ? `${fmtDate(v)}  ${fmtTime(v)}` : 'Still in'),
  },
  { key: 'method', label: 'Method', width: 20, align: 'center' },
  { key: 'verified', label: 'Verified', width: 16, align: 'center' },
];

export async function generateReportPdf({ branch, type, period, rows, summary }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const usableWidth = pageWidth - marginX * 2;

  const columns = type === 'attendance' ? ATTENDANCE_COLUMNS : REVENUE_COLUMNS;

  // ── Header band ──────────────────────────────────────────────
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(16);
  doc.text(branch?.name || 'Gym Branch', marginX, 14);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  let subLine = [];
  if (branch?.address) subLine.push(branch.address);
  if (branch?.phone) subLine.push(`Ph: ${branch.phone}`);
  if (subLine.length) doc.text(subLine.join('   •   '), marginX, 21);

  const title = type === 'attendance' ? 'Attendance Report' : 'Revenue Report';
  doc.setFontSize(9);
  doc.text(`${title} — ${period}`, pageWidth - marginX, 14, { align: 'right' });
  doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, pageWidth - marginX, 21, {
    align: 'right',
  });

  let y = 42;

  // ── Summary stat cards (revenue only) ───────────────────────
  if (summary) {
    const cardW = (usableWidth - 12) / 3;
    const cards = [
      {
        label: 'TOTAL REVENUE',
        value: `Rs.${Number(summary.totalRevenue || 0).toLocaleString('en-IN')}`,
      },
      { label: 'TOTAL ORDERS', value: String(summary.totalOrders || 0) },
      {
        label: 'AVG. ORDER VALUE',
        value: `Rs.${Number(summary.aov || 0).toLocaleString('en-IN')}`,
      },
    ];
    cards.forEach((c, i) => {
      const x = marginX + i * (cardW + 6);
      doc.setFillColor(...SLATE_LIGHT);
      doc.setDrawColor(...SLATE_BORDER);
      doc.roundedRect(x, y, cardW, 20, 2, 2, 'FD');
      doc.setTextColor(...TEXT_MUTED);
      doc.setFontSize(7.5);
      doc.setFont(undefined, 'bold');
      doc.text(c.label, x + 5, y + 8);
      doc.setTextColor(...GREEN);
      doc.setFontSize(13);
      doc.text(c.value, x + 5, y + 16);
    });
    y += 30;
  }

  // ── Table ────────────────────────────────────────────────────
  const rowHeight = 9;
  const headerHeight = 10;

  function drawTableHeader(startY) {
    doc.setFillColor(...SLATE_DARK);
    doc.rect(marginX, startY, usableWidth, headerHeight, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(8);
    let cx = marginX;
    columns.forEach((c) => {
      const tx =
        c.align === 'right' ? cx + c.width - 2 : c.align === 'center' ? cx + c.width / 2 : cx + 2;
      doc.text(c.label, tx, startY + 6.5, { align: c.align === 'left' ? 'left' : c.align });
      cx += c.width;
    });
    return startY + headerHeight;
  }

  y = drawTableHeader(y);

  doc.setFont(undefined, 'normal');
  doc.setFontSize(7.5);

  rows.forEach((row, i) => {
    if (y + rowHeight > pageHeight - 16) {
      doc.addPage();
      y = 16;
      y = drawTableHeader(y);
    }

    if (i % 2 === 1) {
      doc.setFillColor(...SLATE_LIGHT);
      doc.rect(marginX, y, usableWidth, rowHeight, 'F');
    }
    doc.setDrawColor(...SLATE_BORDER);
    doc.line(marginX, y + rowHeight, marginX + usableWidth, y + rowHeight);

    doc.setTextColor(...TEXT_DARK);
    let cx = marginX;
    columns.forEach((c) => {
      const raw = row[c.key];
      const val = c.fmt ? c.fmt(raw) : String(raw ?? '—');
      const tx =
        c.align === 'right' ? cx + c.width - 2 : c.align === 'center' ? cx + c.width / 2 : cx + 2;

      if (c.key === 'status') {
        doc.setTextColor(
          ...(raw === 'CONFIRMED' ? GREEN : raw === 'CANCELLED' ? [220, 38, 38] : TEXT_MUTED)
        );
      } else if (c.key === 'verified') {
        doc.setTextColor(...(raw === 'Yes' ? GREEN : [220, 38, 38]));
      } else {
        doc.setTextColor(...TEXT_DARK);
      }

      doc.text(val, tx, y + 6, { align: c.align === 'left' ? 'left' : c.align });
      cx += c.width;
    });

    y += rowHeight;
  });

  // Outer border for the whole table on the last page section
  doc.setDrawColor(...SLATE_BORDER);
  doc.rect(marginX, 42 + (summary ? 30 : 0), usableWidth, 0); // no-op safeguard, borders drawn per-row above

  // ── Footer on every page ─────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont(undefined, 'normal');
    doc.text('Generated by GymDesk', marginX, pageHeight - 8);
    doc.text(`Page ${p} of ${pageCount}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
  }

  doc.save(`${type}-report-${period}-${Date.now()}.pdf`);
}
