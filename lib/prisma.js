// lib/prisma.js
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Persist the client across hot-reloads in dev AND across serverless invocations in production.
// Without this, every cold-start on Vercel/Render opens a fresh TCP connection to Neon.
const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] });
if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;

export default prisma;