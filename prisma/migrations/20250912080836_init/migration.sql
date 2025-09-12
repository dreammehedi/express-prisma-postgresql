-- CreateEnum
CREATE TYPE "public"."StorageType" AS ENUM ('locally', 'cloudinary');

-- CreateEnum
CREATE TYPE "public"."Status" AS ENUM ('active', 'inactive', 'pending');

-- CreateTable
CREATE TABLE "public"."GlobalSettings" (
    "id" TEXT NOT NULL,
    "siteName" TEXT NOT NULL DEFAULT 'Website Name',
    "siteUrl" TEXT NOT NULL DEFAULT 'https://your-domain.com',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "sessionTimeout" INTEGER NOT NULL DEFAULT 30,
    "passwordMinLength" INTEGER NOT NULL DEFAULT 8,
    "requireTwoFactorAuth" BOOLEAN NOT NULL DEFAULT false,
    "allowUserRegistration" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoBackups" BOOLEAN NOT NULL DEFAULT false,
    "backupFrequency" TEXT NOT NULL DEFAULT 'weekly',
    "backupRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "enableCaching" BOOLEAN NOT NULL DEFAULT true,
    "enableCompression" BOOLEAN NOT NULL DEFAULT true,
    "enableCDN" BOOLEAN NOT NULL DEFAULT false,
    "storageUse" TEXT NOT NULL DEFAULT 'locally',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DatabaseBackup" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "compressed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatabaseBackup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "avatar" TEXT,
    "avatarPublicId" TEXT,
    "phone" TEXT,
    "bio" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "status" "public"."Status" NOT NULL DEFAULT 'pending',
    "resetCode" TEXT,
    "resetCodeExpiration" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "isEmailNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isOrderNotificationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isStockAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isSystemAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorTempToken" TEXT,
    "twoFactorTempExp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "deviceInfo" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DynamicPage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "metaKeywords" TEXT[],
    "canonicalUrl" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterImage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DynamicPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmailConfiguration" (
    "id" TEXT NOT NULL,
    "emailMailer" TEXT NOT NULL,
    "emailHost" TEXT NOT NULL,
    "emailPort" INTEGER NOT NULL,
    "emailUserName" TEXT NOT NULL,
    "emailPassword" TEXT NOT NULL,
    "emailEncryption" TEXT NOT NULL,
    "emailFromName" TEXT NOT NULL,
    "emailAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContactInformation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email2" TEXT,
    "phone" TEXT NOT NULL,
    "phone2" TEXT,
    "address" TEXT NOT NULL,
    "address2" TEXT,
    "businessHoursWeekdays" TEXT NOT NULL,
    "businessHoursWeekends" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactInformation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TrackingIds" (
    "id" TEXT NOT NULL,
    "gtmId" TEXT NOT NULL,
    "gaId" TEXT NOT NULL,
    "fbId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackingIds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SocialNetwork" (
    "id" TEXT NOT NULL,
    "facebookLink" TEXT,
    "twitterLink" TEXT,
    "linkedinLink" TEXT,
    "instagramLink" TEXT,
    "youtubeLink" TEXT,
    "dribbleLink" TEXT,
    "whatsappNumber" TEXT,
    "telegramLink" TEXT,
    "snapchatLink" TEXT,
    "tiktokLink" TEXT,
    "threadsLink" TEXT,
    "pinterestLink" TEXT,
    "redditLink" TEXT,
    "githubLink" TEXT,
    "websiteLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialNetwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SiteConfiguration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "longDescription" TEXT,
    "copyRights" TEXT NOT NULL,
    "logo" TEXT NOT NULL,
    "logoPublicId" TEXT,
    "favicon" TEXT NOT NULL,
    "faviconPublicId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DynamicPage_slug_key" ON "public"."DynamicPage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EmailConfiguration_emailAddress_key" ON "public"."EmailConfiguration"("emailAddress");

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
