import express from "express";
import { upload } from "../../config/upload.js";
import {
  bulkDeleteDynamicPage,
  createDynamicPage,
  deleteDynamicPage,
  dynamicPage,
  getDynamicPage,
  getDynamicPageName,
  getSingleDynamicPage,
  permanentDeleteDynamicPage,
  restoreDynamicPage,
  updateDynamicPage,
} from "../../controllers/other/dynamicPage.controller.js";
import { paginationMiddleware } from "../../middleware/pagination.middleware.js";
import { verifyAdminOld } from "../../middleware/verifyAdmin.js";
import { verifyToken } from "../../middleware/verifyToken.js";

const DynamicPageRouter = express.Router();

DynamicPageRouter.get("/get-dynamic-page", getDynamicPage);
DynamicPageRouter.get("/get-dynamic-page/:slug", getSingleDynamicPage);
DynamicPageRouter.get("/get-dynamic-page-name", getDynamicPageName);
DynamicPageRouter.get("/dynamic-page", paginationMiddleware, dynamicPage);
DynamicPageRouter.get(
  "/dynamic-page/bulk-delete",
  paginationMiddleware,
  deleteDynamicPage
);
DynamicPageRouter.post(
  "/dynamic-page",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  createDynamicPage
);
DynamicPageRouter.put(
  "/dynamic-page",
  verifyToken,
  verifyAdminOld,
  upload.none(),
  updateDynamicPage
);
DynamicPageRouter.patch(
  "/dynamic-page/restore",
  verifyToken,
  verifyAdminOld,
  restoreDynamicPage
);
DynamicPageRouter.delete(
  "/dynamic-page/bulk-delete",
  verifyToken,
  verifyAdminOld,
  bulkDeleteDynamicPage
);
DynamicPageRouter.delete(
  "/dynamic-page/permanent",
  verifyToken,
  verifyAdminOld,
  permanentDeleteDynamicPage
);

export default DynamicPageRouter;
