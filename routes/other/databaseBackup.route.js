import express from "express";
import { upload } from "../../config/upload.js";
import {
  generateDatabaseBackup,
  getDatabaseBackup,
  permanentDeleteDatabaseBackup,
} from "../../controllers/other/databaseBackup.controller.js";
import { paginationMiddleware } from "../../middleware/pagination.middleware.js";
import { verifyAdminOld } from "../../middleware/verifyAdmin.js";
import { verifyToken } from "../../middleware/verifyToken.js";

const DatabaseBackupRouter = express.Router();

DatabaseBackupRouter.get(
  "/database-backup",
  verifyToken,
  verifyAdminOld,
  paginationMiddleware,
  getDatabaseBackup
);

DatabaseBackupRouter.post(
  "/database-backup",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  generateDatabaseBackup
);

DatabaseBackupRouter.delete(
  "/database-backup/permanent",
  verifyToken,
  verifyAdminOld,
  permanentDeleteDatabaseBackup
);

export default DatabaseBackupRouter;
