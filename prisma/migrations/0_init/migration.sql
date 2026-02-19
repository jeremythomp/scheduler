-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "staff_users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'staff',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_requests" (
    "id" SERIAL NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "companyName" TEXT,
    "numberOfVehicles" INTEGER NOT NULL DEFAULT 1,
    "idNumber" TEXT NOT NULL DEFAULT '',
    "servicesRequested" TEXT[],
    "preferredDate" TIMESTAMP(3),
    "preferredTime" TEXT,
    "additionalNotes" TEXT,
    "approvedBy" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "staffNotes" TEXT,
    "cancellationToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_bookings" (
    "id" SERIAL NOT NULL,
    "appointmentRequestId" INTEGER NOT NULL,
    "serviceName" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "scheduledTime" TEXT NOT NULL,
    "location" TEXT,
    "vehicleCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cancellation_logs" (
    "id" SERIAL NOT NULL,
    "appointmentRequestId" INTEGER NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "servicesRequested" TEXT[],
    "scheduledDates" TEXT[],
    "reason" TEXT,
    "cancelledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledVia" TEXT NOT NULL,
    "ipAddress" TEXT,
    "cancelledByStaff" INTEGER,
    "blockId" INTEGER,

    CONSTRAINT "cancellation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "day_blocks" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "blockType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "publicNote" TEXT NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "day_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "staffId" INTEGER NOT NULL,
    "staffName" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "path" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_requests_referenceNumber_key" ON "appointment_requests"("referenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_requests_cancellationToken_key" ON "appointment_requests"("cancellationToken");

-- CreateIndex
CREATE INDEX "appointment_requests_customerEmail_idx" ON "appointment_requests"("customerEmail");

-- CreateIndex
CREATE INDEX "appointment_requests_status_idx" ON "appointment_requests"("status");

-- CreateIndex
CREATE INDEX "appointment_requests_createdAt_idx" ON "appointment_requests"("createdAt");

-- CreateIndex
CREATE INDEX "service_bookings_serviceName_scheduledDate_scheduledTime_idx" ON "service_bookings"("serviceName", "scheduledDate", "scheduledTime");

-- CreateIndex
CREATE INDEX "service_bookings_appointmentRequestId_idx" ON "service_bookings"("appointmentRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_logs_appointmentRequestId_key" ON "cancellation_logs"("appointmentRequestId");

-- CreateIndex
CREATE INDEX "day_blocks_date_idx" ON "day_blocks"("date");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_staffId_idx" ON "audit_logs"("staffId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "feedback_createdAt_idx" ON "feedback"("createdAt");

-- CreateIndex
CREATE INDEX "feedback_source_idx" ON "feedback"("source");

-- AddForeignKey
ALTER TABLE "appointment_requests" ADD CONSTRAINT "appointment_requests_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "staff_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_bookings" ADD CONSTRAINT "service_bookings_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "appointment_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_logs" ADD CONSTRAINT "cancellation_logs_appointmentRequestId_fkey" FOREIGN KEY ("appointmentRequestId") REFERENCES "appointment_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_logs" ADD CONSTRAINT "cancellation_logs_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "day_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "day_blocks" ADD CONSTRAINT "day_blocks_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

