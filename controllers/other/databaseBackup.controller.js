import archiver from "archiver";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { prisma } from "../../lib/prisma.js";
const __dirname = path.resolve();
const execAsync = promisify(exec);
const BACKUP_DIR = path.join(process.cwd(), "backups"); // You can change this

export const getDatabaseBackup = async (req, res) => {
  try {
    const { skip = 0, limit = 10 } = req.pagination || {};
    const search = req.query.search || "";
    const status = req.query.status || undefined;

    const where = {
      AND: [
        search ? { fileName: { contains: search, mode: "insensitive" } } : {},
      ],
    };

    const data = await prisma.databaseBackup.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.databaseBackup.count({ where });
    const totalData = await prisma.databaseBackup.count();

    res.status(200).json({
      success: true,
      data,
      pagination: { total, skip: Number(skip), limit: Number(limit) },
      totalData,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Fetch failed" });
  }
};

export const generateDatabaseBackup = async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR))
      fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `mongodb-backup-${timestamp}.gz`;
    const filePath = path.join(BACKUP_DIR, fileName);

    const mongoUri = process.env.DATABASE_URL;

    // Run mongodump with gzip compression
    const dumpCommand = `mongodump --uri="${mongoUri}" --archive="${filePath}" --gzip`;
    await execAsync(dumpCommand);

    const stats = fs.statSync(filePath);

    // Save metadata to database
    const backup = await prisma.databaseBackup.create({
      data: {
        fileName,
        filePath,
        fileSize: stats.size,
        compressed: true,
      },
    });

    res
      .status(200)
      .json({ success: true, message: "Backup created", data: backup });
  } catch (error) {
    console.error("Backup failed:", error);
    res
      .status(500)
      .json({ success: false, message: "Backup failed", error: error.message });
  }
};

export const permanentDeleteDatabaseBackup = async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No Backup IDs provided" });
  }

  try {
    // Find all backups matching the IDs
    const backups = await prisma.databaseBackup.findMany({
      where: {
        id: { in: ids },
      },
      select: { id: true, filePath: true },
    });

    if (backups.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No matching backups found" });
    }

    // Delete each file from disk if it exists
    backups.forEach((backup) => {
      if (fs.existsSync(backup.filePath)) {
        fs.rmSync(backup.filePath, { recursive: true, force: true });
      }
    });

    // Delete records from database
    await prisma.databaseBackup.deleteMany({
      where: {
        id: { in: ids },
      },
    });

    return res
      .status(200)
      .json({ success: true, message: "Backups deleted successfully" });
  } catch (error) {
    console.error("Delete failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Delete failed", error });
  }
};

export const databaseBackup = async (req, res) => {
  try {
    const settings = await prisma.globalSettings.findFirst();
    const now = new Date();

    // ✅ Check if auto-backup is enabled
    if (!settings.enableAutoBackups && req.method === "GET") {
      return res.status(403).json({
        success: false,
        message: "Auto backup is disabled in global settings.",
      });
    }

    // ✅ Dynamic folder name (based on timestamp)
    const dateFolder = now.toISOString().replace(/[:.]/g, "-");
    const backupFolder = path.join(__dirname, "backups", dateFolder);
    const zipFilePath = `${backupFolder}.zip`;

    // Cleanup if exists
    if (fs.existsSync(backupFolder))
      fs.rmSync(backupFolder, { recursive: true });
    if (fs.existsSync(zipFilePath)) fs.unlinkSync(zipFilePath);

    // Run mongodump
    const terminalCmd = `mongodump --uri="${process.env.DATABASE_URL}" --out="${backupFolder}"`;
    await execAsync(terminalCmd);

    // Optional: Compress if enabled
    if (settings.enableCompression) {
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver("zip", { zlib: { level: 9 } });

        archive.on("error", reject);
        output.on("close", resolve);

        archive.pipe(output);
        archive.directory(backupFolder, false);
        archive.finalize();
      });

      // Optional: delete folder after zip
      fs.rmSync(backupFolder, { recursive: true });
    }

    // ✅ Remove old backups based on retentionDays
    const retentionDays = Number(settings.backupRetentionDays || 20);
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    const backupRoot = path.join(__dirname, "backups");

    fs.readdirSync(backupRoot).forEach((file) => {
      const filePath = path.join(backupRoot, file);
      const stat = fs.statSync(filePath);
      if (now - stat.mtime > retentionMs) {
        fs.rmSync(filePath, { recursive: true, force: true });
      }
    });

    return res.status(200).json({
      success: true,
      message: "Database backup completed",
      zip: settings.enableCompression ? zipFilePath : backupFolder,
    });
  } catch (err) {
    console.error("❌ Backup error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Backup failed", error: err });
  }
};
