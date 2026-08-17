-- AlterTable
ALTER TABLE "couriers" ADD COLUMN "city" TEXT NOT NULL DEFAULT 'طرابلس';
ALTER TABLE "couriers" ADD COLUMN "lastLat" REAL;
ALTER TABLE "couriers" ADD COLUMN "lastLng" REAL;
ALTER TABLE "couriers" ADD COLUMN "lastSeenAt" DATETIME;
