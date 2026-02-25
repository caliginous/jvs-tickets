-- CreateTable
CREATE TABLE "public"."Event" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "seatType" TEXT NOT NULL,
    "seatMapId" INTEGER,
    "coverImage" TEXT,
    "coverImageSize" INTEGER,
    "personalTicket" BOOLEAN NOT NULL DEFAULT false,
    "venueId" INTEGER,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventTicketType" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "capacity" INTEGER,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "colorHex" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "publicSortOrder" INTEGER NOT NULL DEFAULT 0,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventTicketType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EventDate" (
    "id" SERIAL NOT NULL,
    "title" TEXT,
    "eventId" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "totalTicketLimit" INTEGER,
    "ticketSaleStartDate" TIMESTAMP(3),
    "ticketSaleEndDate" TIMESTAMP(3),

    CONSTRAINT "EventDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomField" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL,
    "eventId" INTEGER NOT NULL,

    CONSTRAINT "CustomField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeatMap" (
    "id" SERIAL NOT NULL,
    "definition" TEXT NOT NULL,
    "preview" BYTEA,
    "previewType" TEXT,

    CONSTRAINT "SeatMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Category" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "color" TEXT,
    "activeColor" TEXT,
    "occupiedColor" TEXT,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CategoriesOnEvents" (
    "eventId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "maxAmount" INTEGER,

    CONSTRAINT "CategoriesOnEvents_pkey" PRIMARY KEY ("eventId","categoryId")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "customFields" TEXT,
    "phone" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "paymentType" TEXT NOT NULL,
    "paymentIntent" TEXT,
    "paymentResult" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "seatMapId" INTEGER,
    "eventDateId" INTEGER NOT NULL,
    "shipping" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "invoiceSent" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotencyKey" TEXT NOT NULL,
    "cancellationSecret" TEXT NOT NULL,
    "invoiceNumber" INTEGER,
    "discountCodeId" TEXT,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "originalTotal" DOUBLE PRECISION,
    "finalTotal" DOUBLE PRECISION,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "refundId" TEXT,
    "refundedAt" TIMESTAMP(3),

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SeatReservation" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "seatId" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "eventDateId" INTEGER NOT NULL,

    CONSTRAINT "SeatReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Ticket" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "seatId" INTEGER,
    "secret" TEXT,
    "categoryId" INTEGER,
    "amount" INTEGER NOT NULL DEFAULT 1,
    "firstName" TEXT,
    "lastName" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "eventTicketTypeId" INTEGER,
    "feeCharged" INTEGER NOT NULL DEFAULT 0,
    "priceCharged" INTEGER,
    "taxCharged" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminUser" (
    "id" SERIAL NOT NULL,
    "userName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "readRights" TEXT NOT NULL,
    "writeRights" TEXT NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AdminApiKeys" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "AdminApiKeys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Option" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "data" BYTEA
);

-- CreateTable
CREATE TABLE "public"."Translation" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "translations" TEXT NOT NULL,

    CONSTRAINT "Translation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "data" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "adminUserId" INTEGER,
    "notes" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DiscountCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" TEXT NOT NULL,
    "discountValue" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "usageLimit" INTEGER,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "appliesToEvents" TEXT[],
    "appliesToCategories" TEXT[],
    "minimumOrderValue" DOUBLE PRECISION,
    "maximumDiscount" DOUBLE PRECISION,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Venue" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postcode" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailSettings" (
    "id" TEXT NOT NULL,
    "transportMode" TEXT NOT NULL,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "smtpUser" TEXT,
    "smtpPassword" TEXT,
    "providerName" TEXT,
    "providerUser" TEXT,
    "providerPassword" TEXT,
    "senderEmail" TEXT NOT NULL,
    "senderName" TEXT,
    "bccEmail" TEXT,
    "appBaseUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "EmailSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mailType" TEXT NOT NULL,
    "subjects" JSONB NOT NULL,
    "baseHtml" TEXT NOT NULL,
    "bodyHtml" TEXT,
    "samplePayload" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER,
    "updatedBy" INTEGER,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailLog" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "messageId" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "mailType" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "payload" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailTest" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "testEmail" TEXT NOT NULL,
    "testPayload" JSONB,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "success" BOOLEAN NOT NULL,
    "messageId" TEXT,
    "errorMessage" TEXT,
    "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "testedBy" INTEGER,

    CONSTRAINT "EmailTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventTicketType_eventId_idx" ON "public"."EventTicketType"("eventId");

-- CreateIndex
CREATE INDEX "EventTicketType_isPublic_isActive_idx" ON "public"."EventTicketType"("isPublic", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EventTicketType_eventId_name_key" ON "public"."EventTicketType"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "public"."Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_date_idx" ON "public"."Order"("date");

-- CreateIndex
CREATE INDEX "Order_eventDateId_idx" ON "public"."Order"("eventDateId");

-- CreateIndex
CREATE INDEX "Order_shipping_idx" ON "public"."Order"("shipping");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "Order_cancelledAt_idx" ON "public"."Order"("cancelledAt");

-- CreateIndex
CREATE INDEX "Order_refundId_idx" ON "public"."Order"("refundId");

-- CreateIndex
CREATE INDEX "Ticket_orderId_idx" ON "public"."Ticket"("orderId");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "public"."Ticket"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_eventTicketTypeId_idx" ON "public"."Ticket"("eventTicketTypeId");

-- CreateIndex
CREATE INDEX "Ticket_secret_idx" ON "public"."Ticket"("secret");

-- CreateIndex
CREATE INDEX "Ticket_used_idx" ON "public"."Ticket"("used");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_userName_key" ON "public"."AdminUser"("userName");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "public"."AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminApiKeys_key_key" ON "public"."AdminApiKeys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Option_key_key" ON "public"."Option"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Task_orderId_key" ON "public"."Task"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "DiscountCode_code_key" ON "public"."DiscountCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_name_key" ON "public"."Venue"("name");

-- CreateIndex
CREATE INDEX "EmailSettings_transportMode_idx" ON "public"."EmailSettings"("transportMode");

-- CreateIndex
CREATE INDEX "EmailTemplate_mailType_idx" ON "public"."EmailTemplate"("mailType");

-- CreateIndex
CREATE INDEX "EmailTemplate_isActive_idx" ON "public"."EmailTemplate"("isActive");

-- CreateIndex
CREATE INDEX "EmailLog_status_idx" ON "public"."EmailLog"("status");

-- CreateIndex
CREATE INDEX "EmailLog_sentAt_idx" ON "public"."EmailLog"("sentAt");

-- CreateIndex
CREATE INDEX "EmailLog_mailType_idx" ON "public"."EmailLog"("mailType");

-- CreateIndex
CREATE INDEX "EmailTest_success_idx" ON "public"."EmailTest"("success");

-- CreateIndex
CREATE INDEX "EmailTest_testedAt_idx" ON "public"."EmailTest"("testedAt");

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_seatMapId_fkey" FOREIGN KEY ("seatMapId") REFERENCES "public"."SeatMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "public"."Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventTicketType" ADD CONSTRAINT "EventTicketType_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EventDate" ADD CONSTRAINT "EventDate_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomField" ADD CONSTRAINT "CustomField_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoriesOnEvents" ADD CONSTRAINT "CategoriesOnEvents_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CategoriesOnEvents" ADD CONSTRAINT "CategoriesOnEvents_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_discountCodeId_fkey" FOREIGN KEY ("discountCodeId") REFERENCES "public"."DiscountCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_eventDateId_fkey" FOREIGN KEY ("eventDateId") REFERENCES "public"."EventDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_seatMapId_fkey" FOREIGN KEY ("seatMapId") REFERENCES "public"."SeatMap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SeatReservation" ADD CONSTRAINT "SeatReservation_eventDateId_fkey" FOREIGN KEY ("eventDateId") REFERENCES "public"."EventDate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_eventTicketTypeId_fkey" FOREIGN KEY ("eventTicketTypeId") REFERENCES "public"."EventTicketType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminApiKeys" ADD CONSTRAINT "AdminApiKeys_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "public"."AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DiscountCode" ADD CONSTRAINT "DiscountCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Venue" ADD CONSTRAINT "Venue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."AdminUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailSettings" ADD CONSTRAINT "EmailSettings_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTemplate" ADD CONSTRAINT "EmailTemplate_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTemplate" ADD CONSTRAINT "EmailTemplate_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "public"."AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailLog" ADD CONSTRAINT "EmailLog_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTest" ADD CONSTRAINT "EmailTest_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailTest" ADD CONSTRAINT "EmailTest_testedBy_fkey" FOREIGN KEY ("testedBy") REFERENCES "public"."AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
