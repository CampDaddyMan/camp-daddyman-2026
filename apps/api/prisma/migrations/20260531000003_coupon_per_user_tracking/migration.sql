ALTER TABLE "Coupon" ADD COLUMN "maxUsesPerUser" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "CouponUse" (
  "id"        TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "couponId"  TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CouponUse_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE,
  CONSTRAINT "CouponUse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "CouponUse_couponId_userId_idx" ON "CouponUse"("couponId", "userId");
