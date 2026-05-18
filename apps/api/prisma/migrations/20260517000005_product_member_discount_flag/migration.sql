-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "memberDiscountEnabled" BOOLEAN NOT NULL DEFAULT false;
