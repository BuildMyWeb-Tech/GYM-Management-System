import prisma from '@/lib/prisma';

// Cache owner→branchId mapping to avoid a DB round-trip on every API call
const _cache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes (short enough to pick up status changes)

const authBranchOwner = async (userId) => {
  if (!userId) return null;

  const cached = _cache.get(userId);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.branchId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        branch: {
          select: { id: true, status: true, isActive: true },
        },
      },
    });

    const branchId =
      user?.branch?.status === 'ACTIVE' && user.branch.isActive
        ? user.branch.id
        : null;

    _cache.set(userId, { branchId, at: Date.now() });
    return branchId;
  } catch (error) {
    console.error('authBranchOwner DB error:', error);
    throw new Error('DB_ERROR_AUTH_BRANCH_OWNER');
  }
};

export default authBranchOwner;
