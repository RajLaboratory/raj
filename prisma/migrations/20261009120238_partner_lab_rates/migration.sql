-- CreateTable
CREATE TABLE "OutsourcingRate" (
    "id" TEXT NOT NULL,
    "labId" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "tatHours" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutsourcingRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OutsourcingRate_testId_idx" ON "OutsourcingRate"("testId");

-- CreateIndex
CREATE UNIQUE INDEX "OutsourcingRate_labId_testId_key" ON "OutsourcingRate"("labId", "testId");

-- AddForeignKey
ALTER TABLE "OutsourcingRate" ADD CONSTRAINT "OutsourcingRate_labId_fkey" FOREIGN KEY ("labId") REFERENCES "OutsourcingLab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutsourcingRate" ADD CONSTRAINT "OutsourcingRate_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
