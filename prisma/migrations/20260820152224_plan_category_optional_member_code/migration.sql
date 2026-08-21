/*
  Warnings:

  - A unique constraint covering the columns `[branchId,memberCode]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "MembershipPlan" DROP CONSTRAINT "MembershipPlan_categoryId_fkey";

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "memberCode" TEXT;

-- AlterTable
ALTER TABLE "MembershipPlan" ALTER COLUMN "categoryId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Member_branchId_memberCode_key" ON "Member"("branchId", "memberCode");

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "PlanCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
