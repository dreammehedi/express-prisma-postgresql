import { prisma } from "../lib/prisma.js";

export const attachGlobalSettings = async (req, res, next) => {
  try {
    let settings = await prisma.globalSettings.findFirst();

    if (!settings) {
      // PostgreSQL এ default record create
      settings = await prisma.globalSettings.create({
        data: {
          siteName: "Website Name",
          siteUrl: "https://your-domain.com",
          timezone: "Asia/Dhaka",
          dateFormat: "YYYY-MM-DD",
          currency: "USD",
          sessionTimeout: 30,
          passwordMinLength: 8,
          requireTwoFactorAuth: false,
          allowUserRegistration: true,
          enableAutoBackups: false,
          backupFrequency: "weekly",
          backupRetentionDays: 30,
          enableCaching: true,
          enableCompression: true,
          enableCDN: false,
          storageUse: "locally",
        },
      });
    }

    req.globalSettings = settings;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err?.message || "Failed to attach global settings.",
    });
  }
};
