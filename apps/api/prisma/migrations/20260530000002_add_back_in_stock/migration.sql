CREATE TABLE "BackInStockRequest" (
  "id"        TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "userId"    TEXT,
  "email"     TEXT NOT NULL,
  "notified"  BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BackInStockRequest_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BackInStockRequest_productId_email_key" ON "BackInStockRequest"("productId", "email");
CREATE INDEX "BackInStockRequest_productId_notified_idx" ON "BackInStockRequest"("productId", "notified");
ALTER TABLE "BackInStockRequest" ADD CONSTRAINT "BackInStockRequest_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BackInStockRequest" ADD CONSTRAINT "BackInStockRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
