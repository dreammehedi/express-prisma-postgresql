import { cloudinary } from "../../config/cloudinary.config.js";
import { prisma } from "../../lib/prisma.js";

export const getGlobalSettings = async (req, res) => {
  try {
    const globalSettings = await prisma.globalSettings.findFirst();

    if (!globalSettings) {
      globalSettings = await prisma.globalSettings.create({
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
    res.status(200).json({ success: true, data: globalSettings });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch global settings" });
  }
};

export const updateGlobalSettings = async (req, res) => {
  const allowedDateFormats = ["YYYY-MM-DD", "MM-DD-YYYY", "DD-MM-YYYY"];
  const allowedCurrencies = ["USD", "BDT", "EUR"];

  const {
    id,
    siteName,
    siteUrl,
    timezone,
    dateFormat,
    currency,
    sessionTimeout,
    passwordMinLength,
    requireTwoFactorAuth,
    allowUserRegistration,
    enableAutoBackups,
    backupFrequency,
    backupRetentionDays,
    enableCaching,
    enableCompression,
    enableCDN,
  } = req.body;

  // ❌ Validate required fields
  if (!id) {
    return res.status(400).json({ success: false, message: "ID is required" });
  }

  // ✅ Validate date format
  if (!allowedDateFormats.includes(dateFormat)) {
    return res.status(400).json({
      success: false,
      message: `Invalid date format. Allowed: ${allowedDateFormats.join(", ")}`,
    });
  }

  // ✅ Validate currency
  if (!allowedCurrencies.includes(currency)) {
    return res.status(400).json({
      success: false,
      message: `Invalid currency. Allowed: ${allowedCurrencies.join(", ")}`,
    });
  }

  // ✅ Parse numbers
  const sessionTimeoutNumber = parseInt(sessionTimeout);
  const passwordMinLengthNumber = parseInt(passwordMinLength);
  const backupRetentionDaysNumber = parseInt(backupRetentionDays);

  if (sessionTimeoutNumber < 1 || sessionTimeoutNumber > 1440) {
    return res.status(400).json({
      success: false,
      message: "Session timeout must be between 1 and 1440 minutes",
    });
  }

  if (passwordMinLengthNumber < 6 || passwordMinLengthNumber > 10) {
    return res.status(400).json({
      success: false,
      message: "Password minimum length must be between 6 and 10 characters",
    });
  }

  // ✅ Convert string booleans to actual booleans
  const parseBoolean = (val) =>
    val === true || val === "true" || val === 1 || val === "1";

  try {
    const existingGlobalSettings = await prisma.globalSettings.findUnique({
      where: { id },
    });

    if (!existingGlobalSettings) {
      return res
        .status(404)
        .json({ success: false, message: "Global settings not found" });
    }

    const updated = await prisma.globalSettings.update({
      where: { id },
      data: {
        siteName,
        siteUrl,
        timezone,
        dateFormat,
        currency,
        sessionTimeout: sessionTimeoutNumber,
        passwordMinLength: passwordMinLengthNumber,
        backupRetentionDays: backupRetentionDaysNumber,
        requireTwoFactorAuth: parseBoolean(requireTwoFactorAuth),
        allowUserRegistration: parseBoolean(allowUserRegistration),
        enableAutoBackups: parseBoolean(enableAutoBackups),
        enableCaching: parseBoolean(enableCaching),
        enableCompression: parseBoolean(enableCompression),
        enableCDN: parseBoolean(enableCDN),
        backupFrequency, // validate options if needed
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update global settings",
      error: error.message,
    });
  }
};

export const getContactInformation = async (req, res, next) => {
  try {
    let contactInfo = await prisma.contactInformation.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // If no record exists, create default
    if (!contactInfo) {
      contactInfo = await prisma.contactInformation.create({
        data: {
          email: "info@example.com",
          email2: "",
          phone: "+880123456789",
          phone2: "",
          address: "123 Example Street, Dhaka, Bangladesh",
          address2: "",
          businessHoursWeekdays: "09:00-18:00",
          businessHoursWeekends: "10:00-16:00",
        },
      });
    }

    req.contactInformation = contactInfo;
    res.status(200).json({ success: true, data: contactInfo });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch contact information" });
  }
};

export const updateContactInformation = async (req, res) => {
  const {
    email,
    email2,
    phone,
    phone2,
    address,
    address2,
    id,
    businessHoursWeekdays,
    businessHoursWeekends,
  } = req.body;

  try {
    const existing = await prisma.contactInformation.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Contact information not found" });
    }

    const updated = await prisma.contactInformation.update({
      where: { id },
      data: {
        email,
        email2,
        phone,
        phone2,
        address,
        address2,
        businessHoursWeekdays,
        businessHoursWeekends,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update contact information",
      error: error.message,
    });
  }
};

export const getSocialNetwork = async (req, res) => {
  try {
    let data = await prisma.socialNetwork.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // If no record exists, create default
    if (!data) {
      data = await prisma.socialNetwork.create({
        data: {
          facebookLink: "",
          twitterLink: "",
          linkedinLink: "",
          instagramLink: "",
          youtubeLink: "",
          dribbleLink: "",
          whatsappNumber: "",
          telegramLink: "",
          snapchatLink: "",
          tiktokLink: "",
          threadsLink: "",
          pinterestLink: "",
          redditLink: "",
          githubLink: "",
          websiteLink: "",
        },
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch social network" });
  }
};

export const updateSocialNetwork = async (req, res) => {
  const {
    id,
    facebookLink,
    twitterLink,
    linkedinLink,
    instagramLink,
    youtubeLink,
    dribbleLink,
    whatsappNumber,
    telegramLink,
    snapchatLink,
    tiktokLink,
    threadsLink,
    pinterestLink,
    redditLink,
    githubLink,
    websiteLink,
  } = req.body;

  const links = {
    facebookLink,
    twitterLink,
    linkedinLink,
    instagramLink,
    youtubeLink,
    dribbleLink,
    telegramLink,
    snapchatLink,
    tiktokLink,
    threadsLink,
    pinterestLink,
    redditLink,
    githubLink,
    websiteLink,
  };

  // Validate all provided URLs
  for (const [key, value] of Object.entries(links)) {
    if (!isValidUrl(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid URL format for: ${key}`,
      });
    }
  }

  try {
    const existing = await prisma.socialNetwork.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Social network not found" });
    }

    const updated = await prisma.socialNetwork.update({
      where: { id },
      data: {
        ...links,
        whatsappNumber,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update social network",
      error: error.message,
    });
  }
};

export const getSiteConfiguration = async (req, res) => {
  try {
    let data = await prisma.siteConfiguration.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // If no record exists, create default
    if (!data) {
      data = await prisma.siteConfiguration.create({
        data: {
          name: "My Website",
          shortDescription: "The best website ever",
          longDescription:
            "This is a long description of the website. You can customize it.",
          copyRights: "© 2025 My Website. All rights reserved.",
          logo: "default-logo.png",
          logoPublicId: "",
          favicon: "default-favicon.ico",
          faviconPublicId: "",
        },
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch site configuration" });
  }
};

export const updateSiteConfiguration = async (req, res) => {
  const { name, shortDescription, longDescription, copyRights, id } = req.body;

  try {
    const existing = await prisma.siteConfiguration.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Site configuration not found" });
    }

    const updatedFields = {
      name,
      shortDescription,
      longDescription,
      copyRights,
    };

    // ✅ Update logo if provided
    if (req.files?.logo?.[0]) {
      if (existing.logoPublicId) {
        await cloudinary.uploader.destroy(existing.logoPublicId);
      }

      updatedFields.logo = req.files.logo[0].path;
      updatedFields.logoPublicId = req.files.logo[0].filename;
    }

    // ✅ Update author favicon if provided
    if (req.files?.favicon?.[0]) {
      if (existing.faviconPublicId) {
        await cloudinary.uploader.destroy(existing.faviconPublicId);
      }

      updatedFields.favicon = req.files.favicon[0].path;
      updatedFields.faviconPublicId = req.files.favicon[0].filename;
    }

    const updated = await prisma.siteConfiguration.update({
      where: { id },
      data: updatedFields,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update site configuration",
      error: error.message,
    });
  }
};

export const getTrackingIds = async (req, res) => {
  try {
    let data = await prisma.trackingIds.findFirst({
      orderBy: { createdAt: "desc" },
    });

    // If no record exists, create default
    if (!data) {
      data = await prisma.trackingIds.create({
        data: {
          gtmId: "GTM-XXXXXXX",
          gaId: "UA-XXXXXXX-X",
          fbId: "1234567890",
        },
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch tracking IDs",
    });
  }
};

export const updateTrackingIds = async (req, res) => {
  const { id, gtmId, gaId, fbId } = req.body;

  try {
    const existing = await prisma.trackingIds.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Tracking IDs not found" });
    }

    const updated = await prisma.trackingIds.update({
      where: { id },
      data: {
        gtmId,
        gaId,
        fbId,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update tracking IDs",
      error: error.message,
    });
  }
};
