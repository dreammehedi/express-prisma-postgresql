import nodemailer from "nodemailer";
import decrypt from "../helper/decrypt.js";
import { prisma } from "../lib/prisma.js";

export const sendVerificationEmail = async (email, token, clientUrl) => {
  const emailConfig = await prisma.emailConfiguration.findFirst();

  if (!emailConfig) {
    throw new Error("Email configuration not found.");
  }

  const decryptedPassword = decrypt(emailConfig.emailPassword);
  if (!decryptedPassword) {
    throw new Error("Failed to decrypt email password");
  }

  const verificationUrl = `${clientUrl}/verify-email?token=${token}`;

  const transporter = nodemailer.createTransport({
    service: emailConfig?.emailHost || "smtp.gmail.com",
    auth: {
      user: emailConfig.emailAddress,
      pass: decryptedPassword,
    },
    tls: {
      rejectUnauthorized: false, // 👉 SSL মিসম্যাচ ইগনোর করবে
    },
  });

  const mailOptions = {
    from: `"${emailConfig.emailFromName}" <${emailConfig.emailAddress}>`,
    to: email,
    subject: "Verify your email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4C924D;">Welcome to AksumBase!</h2>
        <p>Thank you for registering. Click the link below to verify your email:</p>
        <p><a href="${verificationUrl}">Verify Email</a></p>
        <p>This link expires in 24 hours.</p>
        <p>Thanks,<br>The AksumBase Team</p>
      </div>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error("❌ Email sending failed:", err.message);
    throw new Error("Failed to send verification email: " + err.message);
  }
};
