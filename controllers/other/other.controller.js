import { cloudinary } from "../../config/cloudinary.config.js";
import { prisma } from "../../lib/prisma.js";

export const getGlobalSettings = async (req, res) => {
  try {
    const globalSettings = await prisma.globalSettings.findFirst();
    res.status(200).json({ success: true, data: globalSettings });
  } catch (error) {
    console.error("Get global settings error:", error);
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
    console.error("Update global settings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update global settings",
      error: error.message,
    });
  }
};

export const getVersionConfig = async (req, res) => {
  try {
    const versioConfig = await prisma.versionConfig.findFirst();
    res.status(200).json({ success: true, data: versioConfig });
  } catch (error) {
    console.error("Get version config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch version config settings",
    });
  }
};

export const updateVersionConfig = async (req, res) => {
  const allowHeaderVersion = ["v1", "v2"];
  const allowFooterVersion = ["v1", "v2"];
  const allowHeroBannerVersion = ["v1", "v2"];
  const allowCategory = ["v1", "v2"];
  const allowBrand = ["v1", "v2"];
  const allowFeaturedProduct = ["v1", "v2"];
  const allowFeaturedBlog = ["v1", "v2"];
  const allowFeatures = ["v1", "v2"];
  const allowNewsletter = ["v1", "v2"];

  const {
    id,
    header,
    footer,
    heroBanner,
    category,
    brand,
    featuredProduct,
    featuredBlog,
    features,
    newsletter,
  } = req.body;

  // ❌ Validate required fields
  if (!id) {
    return res.status(400).json({ success: false, message: "ID is required" });
  }

  // ✅ Validate version
  if (!allowHeaderVersion.includes(header)) {
    return res.status(400).json({
      success: false,
      message: `Invalid header version format. Allowed: ${allowHeaderVersion.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowFooterVersion.includes(footer)) {
    return res.status(400).json({
      success: false,
      message: `Invalid footer version format. Allowed: ${allowFooterVersion.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowHeroBannerVersion.includes(heroBanner)) {
    return res.status(400).json({
      success: false,
      message: `Invalid hero banner version format. Allowed: ${allowHeroBannerVersion.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowCategory.includes(category)) {
    return res.status(400).json({
      success: false,
      message: `Invalid category version format. Allowed: ${allowCategory.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowBrand.includes(brand)) {
    return res.status(400).json({
      success: false,
      message: `Invalid brand version format. Allowed: ${allowBrand.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowFeaturedProduct.includes(featuredProduct)) {
    return res.status(400).json({
      success: false,
      message: `Invalid featured product version format. Allowed: ${allowFeaturedProduct.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowFeaturedBlog.includes(featuredBlog)) {
    return res.status(400).json({
      success: false,
      message: `Invalid featured blog version format. Allowed: ${allowFeaturedBlog.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowFeatures.includes(features)) {
    return res.status(400).json({
      success: false,
      message: `Invalid features version format. Allowed: ${allowFeatures.join(
        ", "
      )}`,
    });
  }

  // ✅ Validate version
  if (!allowNewsletter.includes(newsletter)) {
    return res.status(400).json({
      success: false,
      message: `Invalid newsletter version format. Allowed: ${allowNewsletter.join(
        ", "
      )}`,
    });
  }
  try {
    const existingVersionConfig = await prisma.versionConfig.findUnique({
      where: { id },
    });

    if (!existingVersionConfig) {
      return res
        .status(404)
        .json({ success: false, message: "Version config not found" });
    }

    const updated = await prisma.versionConfig.update({
      where: { id },
      data: {
        header,
        footer,
        heroBanner,
        category,
        brand,
        featuredProduct,
        featuredBlog,
        features,
        newsletter,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update version config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update version config",
      error: error.message,
    });
  }
};

export const getColorConfig = async (req, res) => {
  try {
    const colorConfig = await prisma.colorConfig.findFirst();
    res.status(200).json({ success: true, data: colorConfig });
  } catch (error) {
    console.error("Get color config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch color config settings",
    });
  }
};

export const updateColorConfig = async (req, res) => {
  const { primary, secondary, accent, name, id } = req.body;

  try {
    const existingData = await prisma.colorConfig.findUnique({
      where: { id },
    });

    if (!existingData) {
      return res
        .status(404)
        .json({ success: false, message: "Color config not found" });
    }

    const updated = await prisma.colorConfig.update({
      where: { id },
      data: {
        primary: primary || {},
        secondary: secondary || {},
        accent: accent || {},
        name,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update color config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update color config",
      error: error.message,
    });
  }
};

// GET /api/privacy-policy
export const getPrivacyPolicy = async (req, res) => {
  try {
    const policy = await prisma.privacyPolicy.findFirst();
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    console.error("Get privacy policy error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch privacy policy" });
  }
};

// PUT /api/privacy-policy
export const updatePrivacyPolicy = async (req, res) => {
  const { content, id } = req.body;

  try {
    const existingPolicy = await prisma.privacyPolicy.findUnique({
      where: { id },
    });

    if (!existingPolicy) {
      return res
        .status(404)
        .json({ success: false, message: "Privacy policy not found" });
    }

    const updated = await prisma.privacyPolicy.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update privacy policy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update privacy policy",
      error: error.message,
    });
  }
};

// GET /api/terms-of-use
export const getTermsOfUse = async (req, res) => {
  try {
    const policy = await prisma.termsOfUse.findFirst();
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    console.error("Get terms of use error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch terms of use" });
  }
};

// PUT /api/terms-of-use
export const updateTermsOfUse = async (req, res) => {
  const { content, id } = req.body;

  try {
    const existingPolicy = await prisma.termsOfUse.findUnique({
      where: { id },
    });

    if (!existingPolicy) {
      return res
        .status(404)
        .json({ success: false, message: "Terms of use not found" });
    }

    const updated = await prisma.termsOfUse.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update terms of use error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update terms of use",
      error: error.message,
    });
  }
};

// GET /api/buying-guides
export const getBuyingGuides = async (req, res) => {
  try {
    const data = await prisma.buyingGuides.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get buying guides error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch buying guides" });
  }
};

// PUT /api/buying-guides
export const updateBuyingGuides = async (req, res) => {
  const { content, id } = req.body;
  try {
    const existing = await prisma.buyingGuides.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Buying guide not found" });
    }

    const updated = await prisma.buyingGuides.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update buying guide error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update buying guide",
      error: error.message,
    });
  }
};

export const getSellingTips = async (req, res) => {
  try {
    const data = await prisma.sellingTips.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get selling tips error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch selling tips" });
  }
};

export const updateSellingTips = async (req, res) => {
  const { content, id } = req.body;
  try {
    const existing = await prisma.sellingTips.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Selling tip not found" });
    }

    const updated = await prisma.sellingTips.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update selling tip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update selling tip",
      error: error.message,
    });
  }
};

export const getShippingPolicy = async (req, res) => {
  try {
    const data = await prisma.shippingPolicy.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get shipping policy error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch shipping policy" });
  }
};

export const updateShippingPolicy = async (req, res) => {
  const { content, id } = req.body;
  try {
    const existing = await prisma.shippingPolicy.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Shipping policy not found" });
    }

    const updated = await prisma.shippingPolicy.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update shipping policy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update shipping policy",
      error: error.message,
    });
  }
};

export const getReturnPolicy = async (req, res) => {
  try {
    const data = await prisma.returnPolicy.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get return policy error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch return policy" });
  }
};

export const updateReturnPolicy = async (req, res) => {
  const { content, id } = req.body;

  try {
    const existing = await prisma.returnPolicy.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Return policy not found" });
    }

    const updated = await prisma.returnPolicy.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update return policy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update return policy",
      error: error.message,
    });
  }
};

export const getExchangePolicy = async (req, res) => {
  try {
    const data = await prisma.exchangePolicy.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get exchange policy error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch exchange policy" });
  }
};

export const updateExchangePolicy = async (req, res) => {
  const { content, id } = req.body;

  try {
    const existing = await prisma.exchangePolicy.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Exchange policy not found" });
    }

    const updated = await prisma.exchangePolicy.update({
      where: { id },
      data: { content },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update exchange policy error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update exchange policy",
      error: error.message,
    });
  }
};

export const getContactInformation = async (req, res) => {
  try {
    const data = await prisma.contactInformation.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get contact information error:", error);
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
    console.error("Update contact information error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update contact information",
      error: error.message,
    });
  }
};

export const getSocialNetwork = async (req, res) => {
  try {
    const data = await prisma.socialNetwork.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get social network error:", error);
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
    console.error("Update social network error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update social network",
      error: error.message,
    });
  }
};

export const getSiteConfiguration = async (req, res) => {
  try {
    const data = await prisma.siteConfiguration.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get site configuration error:", error);
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
    console.error("Update site configuration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update site configuration",
      error: error.message,
    });
  }
};

export const getCompanyAchievements = async (req, res) => {
  try {
    const data = await prisma.companyAchievements.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get company achievements error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch company achievements",
    });
  }
};

export const updateCompanyAchievements = async (req, res) => {
  const { id, happyCustomers, productSold, satisfactionRate, customerSupport } =
    req.body;

  try {
    const existing = await prisma.companyAchievements.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Company achievements not found" });
    }

    const updated = await prisma.companyAchievements.update({
      where: { id },
      data: {
        happyCustomers,
        productSold,
        satisfactionRate,
        customerSupport,
      },
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update company achievements error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update company achievements",
      error: error.message,
    });
  }
};

export const getTrackingIds = async (req, res) => {
  try {
    const data = await prisma.trackingIds.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get tracking IDs error:", error);
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
    console.error("Update tracking IDs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update tracking IDs",
      error: error.message,
    });
  }
};

export const getAboutCompany = async (req, res) => {
  try {
    const data = await prisma.aboutCompany.findFirst({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Get about company error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch about company" });
  }
};

export const updateAboutCompany = async (req, res) => {
  const { about, ourStory, id } = req.body;

  try {
    const existing = await prisma.aboutCompany.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "About company not found" });
    }

    const updatedFields = {
      about,
      ourStory,
    };

    // ✅ Update image if provided
    if (req.file) {
      if (existing.imagePublicId) {
        await cloudinary.uploader.destroy(existing.imagePublicId);
      }

      updatedFields.image = req.file.path;
      updatedFields.imagePublicId = req.file.filename;
    }

    const updated = await prisma.aboutCompany.update({
      where: { id },
      data: updatedFields,
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update about company error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update about company",
      error: error.message,
    });
  }
};
