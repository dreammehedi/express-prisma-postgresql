import cron from "node-cron";
import { generateDatabaseBackup } from "../controllers/other/databaseBackup.controller.js";
import { prisma } from "../lib/prisma.js";

let currentTask = null;

const getCronExpression = (frequency) => {
  switch (frequency) {
    case "daily":
      return "0 3 * * *"; // প্রতিদিন 3 AM
    case "weekly":
      return "0 3 * * 1"; // প্রতি সোমবার 3 AM
    case "monthly":
      return "0 3 1 * *"; // প্রতি মাসের 1 তারিখে 3 AM
    default:
      return null;
  }
};

export const setupDynamicCronJob = async () => {
  let settings = await prisma.globalSettings.findFirst();

  // যদি database খালি থাকে, default create করো
  if (!settings) {
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
        enableAutoBackups: true,
        backupFrequency: "weekly",
        backupRetentionDays: 30,
        enableCaching: true,
        enableCompression: true,
        enableCDN: false,
        storageUse: "locally",
      },
    });
  }

  if (!settings.enableAutoBackups) {
    console.log("🔕 Auto-backup is disabled in settings.");
    return;
  }

  const cronExpr = getCronExpression(settings.backupFrequency);

  if (!cronExpr) {
    console.log("⚠️ Invalid backup frequency in settings.");
    return;
  }

  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  currentTask = cron.schedule(cronExpr, async () => {
    console.log("🕒 [CRON] Running scheduled backup task...");
    try {
      await generateDatabaseBackup(
        { method: "GET" },
        { status: () => ({ json: () => {} }) }
      );
    } catch (err) {
      console.error("❌ Cron backup failed:", err.message);
    }
  });

  console.log(
    `✅ [CRON] Scheduled backup: '${settings.backupFrequency}' (${cronExpr})`
  );
};
