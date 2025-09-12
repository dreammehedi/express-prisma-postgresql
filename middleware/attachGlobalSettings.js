import { prisma } from "../lib/prisma.js";

export const attachGlobalSettings = async (req, res, next) => {
  try {
    const settings = await prisma.globalSettings.findFirst();

    if (!settings) {
      return res.status(500).json({
        success: false,
        message: "Global settings not found.",
      });
    }

    req.globalSettings = settings;
    next();
  } catch (err) {
    console.error("AttachGlobalSettings Error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to attach global settings.",
    });
  }
};
