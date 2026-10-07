import { clerkClient } from '@clerk/nextjs/server';

// Cache Clerk API results — admin status rarely changes
const _cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const authAdmin = async (userId) => {
  try {
    if (!userId) return false;

    const cached = _cache.get(userId);
    if (cached && Date.now() - cached.at < CACHE_TTL) return cached.isAdmin;

    const adminEmails = (process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length === 0) {
      _cache.set(userId, { isAdmin: false, at: Date.now() });
      return false;
    }

    const client = await clerkClient();
    const user   = await client.users.getUser(userId);
    const userEmail = (user.emailAddresses[0]?.emailAddress || '').toLowerCase();
    const isAdmin = adminEmails.includes(userEmail);

    _cache.set(userId, { isAdmin, at: Date.now() });
    return isAdmin;
  } catch (error) {
    return false;
  }
};

export default authAdmin;