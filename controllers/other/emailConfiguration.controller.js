import encrypt from "../../helper/encrypt.js";

import { prisma } from "../../lib/prisma.js";

// GET all configurations
export const getEmailConfiguration = async (req, res, next) => {
  try {
    let emailConfigurations = await prisma.emailConfiguration.findMany();

    if (emailConfigurations.length === 0) {
      emailConfigurations = [
        await prisma.emailConfiguration.create({
          data: {
            emailMailer: "",
            emailHost: "",
            emailPort: 0,
            emailUserName: "",
            emailPassword: "",
            emailEncryption: "",
            emailFromName: "",
            emailAddress: "",
          },
        }),
      ];
    }

    req.emailConfigurations = emailConfigurations;

    res.status(200).json({ success: true, data: emailConfigurations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// UPDATE a configuration (PUT with ID in body)
export const updateEmailConfiguration = async (req, res) => {
  try {
    const { id, emailPassword, emailPort, ...otherFields } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email configuration ID!",
      });
    }

    // Check if the config exists
    const existingConfig = await prisma.emailConfiguration.findUnique({
      where: { id },
    });

    if (!existingConfig) {
      return res.status(404).json({
        success: false,
        message: "Email configuration not found!",
      });
    }

    // Prepare update data
    const updateData = { ...otherFields };

    if (emailPassword) {
      updateData.emailPassword = encrypt(emailPassword);
    }
    updateData.emailPort = parseInt(emailPort);

    // Update using Prisma
    await prisma.emailConfiguration.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({
      success: true,
      message: "Email configuration updated successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        error.message ||
        "An error occurred while updating the email configuration.",
    });
  }
};
