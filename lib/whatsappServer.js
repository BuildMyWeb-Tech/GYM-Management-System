// lib/whatsappServer.js
// Server-side WhatsApp utility: WhatsApp Cloud API with wa.me fallback.
// Set WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID in env to enable API sending.
// Without them every call returns a fallbackUrl the admin can open manually.

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

export function isWhatsAppApiConfigured() {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Sends a text message via the WhatsApp Cloud API.
 * Returns { success, method, messageId?, error? }.
 * method is one of: 'api' | 'not_configured' | 'api_error'
 */
export async function sendWhatsAppMessage(toPhone, messageText) {
  const to = normalizePhone(toPhone);
  if (!to) return { success: false, method: 'not_configured', error: 'Invalid phone number' };

  if (!isWhatsAppApiConfigured()) {
    return { success: false, method: 'not_configured' };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: messageText },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        success: false,
        method: 'api_error',
        error: data.error?.message || `HTTP ${res.status}`,
      };
    }

    return { success: true, method: 'api', messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { success: false, method: 'api_error', error: err.message };
  }
}

/**
 * Returns a wa.me URL for manual sending (fallback when API is not configured).
 */
export function buildFallbackUrl(phone, message) {
  const number = normalizePhone(phone);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

// ── Message builders ──────────────────────────────────────────────────────────

export function buildExpiryReminderMessage(memberName, planName, expiryDate, daysLeft, gymName) {
  const dateStr = new Date(expiryDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  const urgency = daysLeft <= 0 ? 'TODAY' : daysLeft === 1 ? 'TOMORROW' : `in ${daysLeft} days`;
  return (
    `Hello ${memberName},\n\n` +
    `⚠️ Your gym membership is expiring ${urgency}!\n\n` +
    `Plan: ${planName}\n` +
    `Expiry Date: ${dateStr}\n\n` +
    `Please renew your membership to continue your fitness journey without interruption.\n\n` +
    `Visit us or contact your gym to renew.\n` +
    (gymName ? `\n— ${gymName}` : '')
  );
}

export function buildPaymentReminderMessage(memberName, planName, expiryDate, daysSince, gymName) {
  const dateStr = new Date(expiryDate).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
  return (
    `Hello ${memberName},\n\n` +
    `💳 Your gym membership (${planName}) expired ${daysSince} day${daysSince !== 1 ? 's' : ''} ago on ${dateStr}.\n\n` +
    `Renew now to continue your workouts without missing any sessions.\n\n` +
    `We'd love to see you back — please visit us or contact your gym to renew.\n` +
    (gymName ? `\n— ${gymName}` : '')
  );
}
