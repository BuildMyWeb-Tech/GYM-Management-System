// lib/whatsapp.js

/**
 * Normalizes a phone number to WhatsApp's expected format: digits only,
 * with an Indian country code prepended if a 10-digit local number is given.
 */
export function normalizeWhatsAppNumber(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

/**
 * Builds the payment confirmation message text for a completed order.
 * `order` shape: { member: { fullName, phone }, orderItems: [{ name }], subtotal, total, paymentMethod }
 */
export function buildPaymentConfirmationMessage(order, branchWhatsapp) {
  const firstName = order.member?.fullName || 'there';
  const planNames = (order.orderItems || []).map((i) => i.name).join(', ') || 'Membership';
  const amount = Number(order.subtotal || 0).toLocaleString('en-IN');
  const total = Number(order.total || 0).toLocaleString('en-IN');
  const method = order.paymentMethod === 'UPI' ? 'UPI' : 'Cash';

  let message =
    `Hello ${firstName},\n\n` +
    `Your gym membership payment has been successfully completed.\n\n` +
    `Plan: ${planNames}\n` +
    `Amount: ₹${amount}\n` +
    `Payment Method: ${method}\n` +
    `Total Paid: ₹${total}\n\n` +
    `Thank you for choosing our gym.\n` +
    `We look forward to seeing you!`;

  if (branchWhatsapp) {
    message += `\n\nFor any queries, contact us at ${branchWhatsapp}`;
  }

  return message;
}

/**
 * Builds a wa.me deep link that opens WhatsApp (Web or app) with the
 * message pre-filled, addressed to the member's number.
 */
export function buildWhatsAppLink(memberPhone, message) {
  const number = normalizeWhatsAppNumber(memberPhone);
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

/**
 * Opens the WhatsApp confirmation for a completed order in a new tab.
 */
export function sendWhatsAppConfirmation(order, branchWhatsapp) {
  const message = buildPaymentConfirmationMessage(order, branchWhatsapp);
  const link = buildWhatsAppLink(order.member?.phone, message);
  window.open(link, '_blank', 'noopener,noreferrer');
}
