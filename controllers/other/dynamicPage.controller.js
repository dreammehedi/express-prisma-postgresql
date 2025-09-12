import slugify from "slugify";

import { prisma } from "../../lib/prisma.js";

export const getDynamicPageName = async (req, res) => {
  try {
    const data = await prisma.dynamicPage.findMany({
      where: {
        status: "active",
        deleted: false,
      },
      orderBy: { createdAt: "desc" },
      select: {
        name: true,
        slug: true,
        description: true,
      },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch page" });
  }
};

export const getDynamicPage = async (req, res) => {
  try {
    const data = await prisma.dynamicPage.findMany({
      where: {
        status: "active",
        deleted: false,
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch page" });
  }
};

export const getSingleDynamicPage = async (req, res) => {
  try {
    const { slug } = req.params;
    const data = await prisma.dynamicPage.findUnique({
      where: {
        status: "active",
        slug: slug,
        deleted: false,
      },
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch page" });
  }
};

export const dynamicPage = async (req, res) => {
  try {
    const { skip = 0, limit = 10 } = req.pagination || {};
    const search = req.query.search || "";
    const status = req.query.status || undefined;
    const deleted = req.query.deleted || undefined;

    const where = {
      AND: [
        { deleted: false },
        status !== undefined ? { status } : {},
        deleted !== undefined ? { deleted } : {},
        search ? { name: { contains: search, mode: "insensitive" } } : {},
      ],
    };

    const data = await prisma.dynamicPage.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.dynamicPage.count({ where });
    const totalData = await prisma.dynamicPage.count();
    const totalActiveData = await prisma.dynamicPage.count({
      where: {
        status: "active",
        deleted: false,
      },
    });

    const totalInActiveData = await prisma.dynamicPage.count({
      where: {
        status: "inactive",
        deleted: false,
      },
    });
    const totalBulkDeleteData = await prisma.dynamicPage.count({
      where: {
        deleted: true,
      },
    });
    res.status(200).json({
      success: true,
      data,
      pagination: { total, skip: Number(skip), limit: Number(limit) },
      totalData,
      totalActiveData,
      totalInActiveData,
      totalBulkDeleteData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch page" });
  }
};

export const deleteDynamicPage = async (req, res) => {
  try {
    const { skip = 0, limit = 10 } = req.pagination || {};
    const search = req.query.search || "";
    const status = req.query.status || undefined;

    const where = {
      AND: [
        { deleted: true },
        status !== undefined ? { status } : {},
        search ? { name: { contains: search, mode: "insensitive" } } : {},
      ],
    };

    const data = await prisma.dynamicPage.findMany({
      where,
      skip: Number(skip),
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });
    const total = await prisma.dynamicPage.count({ where });
    const totalData = await prisma.dynamicPage.count();
    const totalActiveData = await prisma.dynamicPage.count({
      where: {
        status: "active",
        deleted: false,
      },
    });

    const totalInActiveData = await prisma.dynamicPage.count({
      where: {
        status: "inactive",
        deleted: false,
      },
    });
    const totalBulkDeleteData = await prisma.dynamicPage.count({
      where: {
        deleted: true,
      },
    });
    res.status(200).json({
      success: true,
      data,
      pagination: { total, skip: Number(skip), limit: Number(limit) },
      totalData,
      totalActiveData,
      totalInActiveData,
      totalBulkDeleteData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch page" });
  }
};
export const createDynamicPage = async (req, res) => {
  const {
    name,
    description,
    content,
    metaTitle,
    metaDescription,
    metaKeywords,
  } = req.body;
  try {
    // 1. Validate required fields
    if (
      !name ||
      !description ||
      !content ||
      !metaTitle ||
      !metaDescription ||
      !metaKeywords
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    // 2. Generate slug
    const slug = slugify(name, { lower: true, strict: true });

    // 3. Check for unique slug
    const existingData = await prisma.dynamicPage.findUnique({
      where: { slug },
    });

    if (existingData) {
      return res.status(409).json({
        success: false,
        message: "A value with this title already exists.",
      });
    }

    // 5. Create new entry
    const newData = await prisma.dynamicPage.create({
      data: {
        name,
        slug,
        description,
        content,
        status: "active",
        metaTitle,
        metaDescription,
        metaKeywords: Array.isArray(metaKeywords)
          ? metaKeywords
          : JSON.parse(metaKeywords || "[]"),
        canonicalUrl: `${process.env.FRONTEND_LINK}/blogs/${slug}`,
        ogTitle: name,
        ogDescription: description,
        ogImage: "",
        twitterTitle: name,
        twitterDescription: description,
        twitterImage: "",
      },
    });

    res.status(201).json({ success: true, data: newData });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create page",
      error: error.message,
    });
  }
};

export const updateDynamicPage = async (req, res) => {
  const {
    id,
    name,
    content,
    description,
    metaTitle,
    metaDescription,
    metaKeywords,
    status,
  } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, message: "Missing id" });
  }

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be either 'active' or 'inactive'.",
    });
  }

  try {
    const existingPage = await prisma.dynamicPage.findUnique({ where: { id } });

    if (!existingPage) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    const slug = slugify(name, { lower: true, strict: true });

    const duplicatePage = await prisma.dynamicPage.findFirst({
      where: { slug, NOT: { id } },
    });

    if (duplicatePage) {
      return res.status(409).json({
        success: false,
        message: "Another page with this name already exists",
      });
    }

    const parsedKeywords = Array.isArray(metaKeywords)
      ? metaKeywords
      : JSON.parse(metaKeywords || "[]");

    const updatedPage = await prisma.dynamicPage.update({
      where: { id },
      data: {
        name,
        slug,
        content,
        description,
        status,
        metaTitle,
        metaDescription,
        metaKeywords: parsedKeywords,
        canonicalUrl: `${process.env.FRONTEND_LINK}/blogs/${slug}`,
        ogTitle: name,
        ogDescription: description,
        twitterTitle: name,
        twitterDescription: description,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({ success: true, data: updatedPage });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update page",
      error: error.message,
    });
  }
};

// ✅ Soft Delete Bulk
export const bulkDeleteDynamicPage = async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No Page IDs provided" });
  }

  try {
    await prisma.dynamicPage.updateMany({
      where: { id: { in: ids } },
      data: { deleted: true },
    });

    res.status(200).json({ success: true, message: "Page soft deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const restoreDynamicPage = async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No Page IDs provided" });
  }

  try {
    await prisma.dynamicPage.updateMany({
      where: { id: { in: ids } },
      data: { deleted: false },
    });

    res.status(200).json({ success: true, message: "Page restored" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Permanent Delete
export const permanentDeleteDynamicPage = async (req, res) => {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "No Page IDs provided" });
  }

  try {
    await prisma.dynamicPage.deleteMany({
      where: { id: { in: ids } },
    });

    res
      .status(200)
      .json({ success: true, message: "Page permanently deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
