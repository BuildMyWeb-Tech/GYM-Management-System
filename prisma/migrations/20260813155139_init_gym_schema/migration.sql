-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('RECEPTIONIST', 'MANAGER');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'FROZEN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceMethod" AS ENUM ('BIOMETRIC', 'MANUAL', 'QR');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ACTIVE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('MEMBERSHIP_PLAN', 'PT_PACKAGE', 'SUPPLEMENT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'CARD', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EXPIRY_REMINDER', 'PAYMENT_DUE', 'RENEWAL_CONFIRMATION');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('SENT', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "image" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "status" "BranchStatus" NOT NULL DEFAULT 'PENDING',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "logo" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "operatingHours" TEXT,
    "gstNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "role" "EmployeeRole" NOT NULL DEFAULT 'RECEPTIONIST',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "branchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PTPackage" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sessionCount" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "trainerName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PTPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "branchId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photo" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "address" TEXT,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactNumber" TEXT NOT NULL,
    "deviceUserId" TEXT,
    "joinDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "freezeStart" TIMESTAMP(3),
    "freezeEnd" TIMESTAMP(3),
    "freezeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3),
    "method" "AttendanceMethod" NOT NULL DEFAULT 'BIOMETRIC',
    "deviceUserId" TEXT,
    "deviceSerial" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "correctedById" TEXT,
    "correctionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiometricDevice" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "deviceSerial" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BiometricDevice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "commissionAmt" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "isPaid" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "paymentRef" TEXT,
    "isCouponUsed" BOOLEAN NOT NULL DEFAULT false,
    "couponCode" TEXT,
    "couponDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "itemType" "OrderItemType" NOT NULL,
    "membershipPlanId" TEXT,
    "ptPackageId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTimeline" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "changedBy" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "messageRef" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL,
    "forNewMember" BOOLEAN NOT NULL,
    "forMember" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_userId_key" ON "Branch"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_username_key" ON "Branch"("username");

-- CreateIndex
CREATE INDEX "Branch_status_idx" ON "Branch"("status");

-- CreateIndex
CREATE INDEX "Branch_isActive_idx" ON "Branch"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Commission_branchId_key" ON "Commission"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_branchId_idx" ON "Employee"("branchId");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "PlanCategory_branchId_idx" ON "PlanCategory"("branchId");

-- CreateIndex
CREATE INDEX "PlanCategory_isGlobal_idx" ON "PlanCategory"("isGlobal");

-- CreateIndex
CREATE UNIQUE INDEX "PlanCategory_name_branchId_key" ON "PlanCategory"("name", "branchId");

-- CreateIndex
CREATE INDEX "MembershipPlan_branchId_idx" ON "MembershipPlan"("branchId");

-- CreateIndex
CREATE INDEX "MembershipPlan_status_idx" ON "MembershipPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_slug_branchId_key" ON "MembershipPlan"("slug", "branchId");

-- CreateIndex
CREATE INDEX "PTPackage_branchId_idx" ON "PTPackage"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_userId_key" ON "Member"("userId");

-- CreateIndex
CREATE INDEX "Member_branchId_idx" ON "Member"("branchId");

-- CreateIndex
CREATE INDEX "Member_phone_idx" ON "Member"("phone");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Member_branchId_deviceUserId_key" ON "Member"("branchId", "deviceUserId");

-- CreateIndex
CREATE INDEX "Membership_memberId_idx" ON "Membership"("memberId");

-- CreateIndex
CREATE INDEX "Membership_branchId_idx" ON "Membership"("branchId");

-- CreateIndex
CREATE INDEX "Membership_status_idx" ON "Membership"("status");

-- CreateIndex
CREATE INDEX "Membership_expiryDate_idx" ON "Membership"("expiryDate");

-- CreateIndex
CREATE INDEX "Attendance_memberId_idx" ON "Attendance"("memberId");

-- CreateIndex
CREATE INDEX "Attendance_branchId_idx" ON "Attendance"("branchId");

-- CreateIndex
CREATE INDEX "Attendance_checkIn_idx" ON "Attendance"("checkIn");

-- CreateIndex
CREATE INDEX "Attendance_verified_idx" ON "Attendance"("verified");

-- CreateIndex
CREATE UNIQUE INDEX "BiometricDevice_deviceSerial_key" ON "BiometricDevice"("deviceSerial");

-- CreateIndex
CREATE INDEX "BiometricDevice_branchId_idx" ON "BiometricDevice"("branchId");

-- CreateIndex
CREATE INDEX "Order_branchId_idx" ON "Order"("branchId");

-- CreateIndex
CREATE INDEX "Order_memberId_idx" ON "Order"("memberId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderTimeline_orderId_idx" ON "OrderTimeline"("orderId");

-- CreateIndex
CREATE INDEX "OrderTimeline_createdAt_idx" ON "OrderTimeline"("createdAt");

-- CreateIndex
CREATE INDEX "NotificationLog_memberId_idx" ON "NotificationLog"("memberId");

-- CreateIndex
CREATE INDEX "NotificationLog_branchId_idx" ON "NotificationLog"("branchId");

-- CreateIndex
CREATE INDEX "NotificationLog_status_idx" ON "NotificationLog"("status");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanCategory" ADD CONSTRAINT "PlanCategory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlanCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PTPackage" ADD CONSTRAINT "PTPackage_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricDevice" ADD CONSTRAINT "BiometricDevice_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "MembershipPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_ptPackageId_fkey" FOREIGN KEY ("ptPackageId") REFERENCES "PTPackage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTimeline" ADD CONSTRAINT "OrderTimeline_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
