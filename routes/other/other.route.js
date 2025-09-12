import express from "express";
import { upload } from "../../config/upload.js";
import { verifyToken } from "../../middleware/verifyToken.js";

const OtherRouter = express.Router();

import {
  getContactInformation,
  getGlobalSettings,
  getSiteConfiguration,
  getSocialNetwork,
  getTrackingIds,
  updateContactInformation,
  updateGlobalSettings,
  updateSiteConfiguration,
  updateSocialNetwork,
  updateTrackingIds,
} from "../../controllers/other/other.controller.js";
import { verifyAdminOld } from "../../middleware/verifyAdmin.js";

OtherRouter.get("/global-settings", getGlobalSettings);
OtherRouter.put(
  "/global-settings",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  updateGlobalSettings
);

OtherRouter.get("/contact-information", getContactInformation);
OtherRouter.put(
  "/contact-information",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  updateContactInformation
);

OtherRouter.get("/social-network", getSocialNetwork);
OtherRouter.put(
  "/social-network",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  updateSocialNetwork
);

OtherRouter.get("/site-configuration", getSiteConfiguration);
OtherRouter.put(
  "/site-configuration",
  verifyToken,
  verifyAdminOld,
  upload.fields([
    { name: "logo", maxCount: 1 },
    { name: "favicon", maxCount: 1 },
  ]),
  updateSiteConfiguration
);

OtherRouter.get("/tracking-ids", getTrackingIds);
OtherRouter.put(
  "/tracking-ids",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  updateTrackingIds
);

export default OtherRouter;
