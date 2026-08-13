import prisma from '@/lib/prisma';

/**
 * Verifies userId owns an ACTIVE branch.
 * Returns branchId string | null.
 * Throws on DB error so callers can return 500 instead of silent 401.
 */
const authBranchOwner = async (userId) => {
  if (!userId) return null;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        branch: {
          select: {
            id: true,
            status: true,
            isActive: true,
          },
        },
      },
    });

    if (!user || !user.branch) return null;

    // Must be ACTIVE status (set by admin after approval)
    if (user.branch.status !== 'ACTIVE' || !user.branch.isActive) return null;

    return user.branch.id;
  } catch (error) {
    console.error('authBranchOwner DB error:', error);
    throw new Error('DB_ERROR_AUTH_BRANCH_OWNER');
  }
};

export default authBranchOwner;
