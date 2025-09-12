import express from "express";
import { upload } from "../../config/upload.js";
import {
  getEmailConfiguration,
  updateEmailConfiguration,
} from "../../controllers/other/emailConfiguration.controller.js";
import { verifyAdminOld } from "../../middleware/verifyAdmin.js";
import { verifyToken } from "../../middleware/verifyToken.js";

const EmailConfigurationRouter = express.Router();

EmailConfigurationRouter.get("/email-configuration", getEmailConfiguration);
EmailConfigurationRouter.put(
  "/email-configuration",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  updateEmailConfiguration
);

export default EmailConfigurationRouter;
