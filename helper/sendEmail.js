import nodemailer from "nodemailer";
import { prisma } from "../lib/prisma.js";
import decrypt from "./decrypt.js";

export const sendEmail = async ({ to, subject, html }) => {
  const [emailConfig, siteConfig, contactInfo] = await Promise.all([
    prisma.emailConfiguration.findFirst(),
    prisma.siteConfiguration.findFirst(),
    prisma.contactInformation.findFirst(),
  ]);

  if (!emailConfig) {
    throw new Error("Email configuration not found.");
  }
  if (!siteConfig) {
    throw new Error("Site configuration not found.");
  }
  if (!contactInfo) {
    throw new Error("Contact information not found.");
  }

  const decryptedPassword = decrypt(emailConfig.emailPassword);
  if (!decryptedPassword) {
    throw new Error("Failed to decrypt email password.");
  }

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: emailConfig.emailAddress,
      pass: decryptedPassword,
    },
  });

  const fullHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="${siteConfig.logo}" alt="${
    siteConfig.name
  } Logo" style="max-height: 60px;" />
        <h2 style="margin: 10px 0; color: #4C924D;">${siteConfig.name}</h2>
      </div>
      <div style="font-size: 14px; color: #333;">
        ${html}
      </div>
      <hr style="margin: 30px 0;" />
      <div style="font-size: 12px; color: #666;">
        <p><strong>Contact Info:</strong></p>
        <p>📧 ${contactInfo.email || "support@example.com"}</p>
        <p>📞 ${contactInfo.phone || "N/A"}</p>
        <p>📍 ${contactInfo.address || "Address not set"}</p>
      </div>
      <p style="font-size: 11px; color: #999; text-align: center; margin-top: 20px;">
        &copy; ${new Date().getFullYear()} ${
    siteConfig.copyRights?.trim() || siteConfig.name
  }. All rights reserved.
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"${siteConfig.name}" <${emailConfig.emailUserName}>`,
    to,
    subject,
    html: fullHtml,
  };

  await transporter.sendMail(mailOptions);
};
