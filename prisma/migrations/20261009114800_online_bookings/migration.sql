-- CreateEnum
CREATE TYPE "OnlineBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('LAB', 'HOME');

-- CreateTable
CREATE TABLE "OnlineBooking" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "OnlineBookingStatus" NOT NULL DEFAULT 'PENDING',
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER,
    "sex" "Sex",
    "visitType" "VisitType" NOT NULL,
    "address" TEXT,
    "preferredDate" DATE NOT NULL,
    "slot" TEXT NOT NULL,
    "notes" TEXT,
    "items" JSONB NOT NULL,
    "totalPaise" INTEGER NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnlineBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnlineBooking_reference_key" ON "OnlineBooking"("reference");

-- CreateIndex
CREATE INDEX "OnlineBooking_branchId_status_preferredDate_idx" ON "OnlineBooking"("branchId", "status", "preferredDate");

-- CreateIndex
CREATE INDEX "OnlineBooking_phone_idx" ON "OnlineBooking"("phone");

-- AddForeignKey
ALTER TABLE "OnlineBooking" ADD CONSTRAINT "OnlineBooking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
