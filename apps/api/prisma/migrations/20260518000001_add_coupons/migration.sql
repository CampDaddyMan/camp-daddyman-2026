-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED');

-- CreateTable
CREATE TABLE "Coupon" (
  "id"             TEXT NOT NULL,
  "code"           TEXT NOT NULL,
  "type"           "CouponType" NOT NULL,
  "value"          DOUBLE PRECISION NOT NULL,
  "minOrderAmount" DOUBLE PRECISION,
  "maxUses"        INTEGER,
  "usedCount"      INTEGER NOT NULL DEFAULT 0,
  "active"         BOOLEAN NOT NULL DEFAULT true,
  "expiresAt"      TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AlterTable Order — coupon fields
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponId"       TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponCode"     TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "couponDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;

ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey"
  FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
