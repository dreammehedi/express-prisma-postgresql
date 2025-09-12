import cron from "node-cron";
import { generateDatabaseBackup } from "../controllers/other/databaseBackup.controller.js";
import { prisma } from "../lib/prisma.js";

// Reference to currently running task
let currentTask = null;

// Helper: Map frequency to cron expression
const getCronExpression = (frequency) => {
  switch (frequency) {
    case "daily":
      return "0 3 * * *"; // Every day at 3 AM
    case "weekly":
      return "0 3 * * 1"; // Every Monday at 3 AM
    case "monthly":
      return "0 3 1 * *"; // 1st of each month at 3 AM
    default:
      return null;
  }
};

export const setupDynamicCronJob = async () => {
  const settings = await prisma.globalSettings.findFirst();

  if (!settings || !settings.enableAutoBackups) {
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
      // Run logic directly (NOT via API call)
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
