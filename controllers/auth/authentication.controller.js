dotenv.config();
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import speakeasy from "speakeasy";
import { cloudinary } from "../../config/cloudinary.config.js";
import decrypt from "../../helper/decrypt.js";
import { sendEmail } from "../../helper/sendEmail.js";
import { prisma } from "../../lib/prisma.js";
import { createError } from "../../utils/error.js";

export const registerUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const missingFields = [];
    if (!email) missingFields.push("Email");
    if (!username) missingFields.push("Username");
    if (!password) missingFields.push("Password");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} field(s) are required.`,
      });
    }

    const globalSettings = await prisma.globalSettings.findFirst();

    if (!globalSettings) {
      return res.status(500).json({
        success: false,
        message: "Global settings not found. Please configure system settings.",
      });
    }
    if (!globalSettings.allowUserRegistration) {
      return res.status(403).json({
        success: false,
        message:
          "User registration is currently disabled by the system administrator.",
      });
    }
    if (!password || password.length < globalSettings.passwordMinLength) {
      return res.status(400).json({
        success: false,
        message: `Password must be at least ${globalSettings.passwordMinLength} characters long.`,
      });
    }

    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered with this email or username.",
      });
    }

    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: "user",
        status: "active",
        avatar: "",
        avatarPublicId: "",
        resetCode: "",
        resetCodeExpiration: new Date(),
        isTwoFactorEnabled: globalSettings?.requireTwoFactorAuth,
      },
    });

    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Step 1: Create session
    const session = await prisma.session.create({
      data: {
        userId: newUser.id,
        token: "temp",
        deviceInfo,
        expiresAt,
      },
    });

    // Step 2: Generate JWT with session ID
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        sessionId: session.id,
        token: newUser.token,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Step 3: Update session with token
    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      payload: {
        _id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status,
        token,
        createdAt: newUser.createdAt,
        isTwoFactorEnabled: newUser.isTwoFactorEnabled,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during registration.",
    });
  }
};

export const registerAdmin = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    const missingFields = [];
    if (!email) missingFields.push("Email");
    if (!username) missingFields.push("Username");
    if (!password) missingFields.push("Password");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} field(s) are required.`,
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }],
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered with this email or username.",
      });
    }

    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: "admin",
        isAdmin: true,
        status: "active",
        avatar: "",
        avatarPublicId: "",
        resetCode: "",
        resetCodeExpiration: new Date(),
      },
    });

    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Step 1: Create session
    const session = await prisma.session.create({
      data: {
        userId: newUser.id,
        token: "temp",
        deviceInfo,
        expiresAt,
      },
    });

    // Step 2: Generate JWT with session ID
    const token = jwt.sign(
      {
        userId: newUser.id,
        email: newUser.email,
        sessionId: session.id,
        token: newUser.token,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Step 3: Update session with token
    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });
    await sendEmail({
      to: newUser.email,
      subject: "Your Admin Account Has Been Created",
      html: `
    <h2>Welcome to Ultra E-commerce!</h2>
    <p>Your admin account has been successfully created.</p>
    <p><strong>Email:</strong> ${newUser.email}</p>
    <p><strong>Password:</strong> ${password}</p>
    <p>Please keep this information secure and consider changing your password after first login.</p>
  `,
    });

    res.status(201).json({
      success: true,
      message: "Admin registered successfully.",
      payload: {
        _id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status,
        token,
        createdAt: newUser.createdAt,
        isTwoFactorEnabled: newUser.isTwoFactorEnabled,
      },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during registration.",
    });
  }
};

export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Only super_admin can delete admins
    if (req.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Only super admins can delete admin accounts.",
      });
    }

    // 2. Prevent deleting own account
    if (req.user?.id === id) {
      return res.status(403).json({
        success: false,
        message: "You cannot delete your own super admin account.",
      });
    }

    // 3. Find target user
    const targetUser = await prisma.user.findUnique({ where: { id } });

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: "Admin not found.",
      });
    }

    if (!targetUser.isAdmin || targetUser.role === "super_admin") {
      return res.status(400).json({
        success: false,
        message: "You can only delete admin accounts, not super admins.",
      });
    }

    // 4. Delete related records
    await Promise.all([prisma.session.deleteMany({ where: { userId: id } })]);

    // 5. Delete the user
    await prisma.user.delete({ where: { id } });

    // 6. Send email notification
    await sendEmail({
      to: targetUser.email,
      subject: "Your Admin Account Has Been Deleted",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #d9534f;">Account Deleted</h2>
          <p>Dear ${targetUser.username || "Admin"},</p>
          <p>Your admin account for <strong>Ultra E-commerce</strong> has been <strong>deleted</strong> by a super admin.</p>
          <p>If you believe this was a mistake, please contact our support team immediately.</p>
          <br />
          <p>Best regards,<br/>The Ultra E-commerce Team</p>
        </div>
      `,
    });

    // 7. Response
    res.status(200).json({
      success: true,
      message: "Admin account and all related data deleted successfully.",
    });
  } catch (error) {
    console.error("Delete Admin Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred while deleting admin.",
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required." });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.status !== "active")
      return res.status(403).json({
        message: `Your Ultra E-commerce account has been ${user.status} by an administrator. If you believe this was a mistake, please contact support.`,
      });

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid email or password." });

    // 2FA
    if (user.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorTempToken: otp,
          twoFactorTempExp: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      await sendOtpEmail(user.email, otp);

      return res.status(200).json({
        success: true,
        step: "2fa",
        message: "OTP sent to your email. Please verify.",
        email: user.email,
      });
    }

    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Step 1: Create session
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: "temp",
        deviceInfo,
        expiresAt,
      },
    });

    // Step 2: Generate token with sessionId
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        sessionId: session.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Step 3: Update session with real token
    await prisma.session.update({
      where: { id: session.id },
      data: { token: jwtToken },
    });

    const { id, username, role, status, createdAt, isTwoFactorEnabled } = user;

    res.status(200).json({
      success: true,
      message: "Login successful.",
      payload: {
        _id: id,
        name: username,
        email,
        role,
        status,
        createdAt,
        isTwoFactorEnabled,
        token: jwtToken,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res
      .status(500)
      .json({ message: error.message || "Server error during login." });
  }
};

export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const session = await prisma.session.findUnique({
      where: { id: decoded.sessionId },
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: "Session not found.",
      });
    }

    // ✅ Delete session from DB
    await prisma.session.delete({
      where: { id: session.id },
    });

    res.clearCookie("token"); // optional for cookie-based auth
    res.status(200).json({
      success: true,
      message: "Logged out successfully and session deleted.",
    });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Logout failed.",
    });
  }
};

async function sendOtpEmail(email, otp) {
  // 1. Fetch all configurations
  const [emailConfig, siteConfig, contactInfo] = await Promise.all([
    prisma.emailConfiguration.findFirst(),
    prisma.siteConfiguration.findFirst(),
    prisma.contactInformation.findFirst(),
  ]);
  // 2. Validate required configs
  if (!emailConfig) throw new Error("Email configuration not found.");
  if (!siteConfig) throw new Error("Site configuration not found.");
  if (!contactInfo) throw new Error("Contact information not found.");

  // 3. Decrypt email password
  const decryptedPassword = decrypt(emailConfig.emailPassword);
  if (!decryptedPassword) throw new Error("Failed to decrypt email password");

  // 4. Prepare transporter
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: emailConfig.emailAddress,
      pass: decryptedPassword,
    },
  });

  // 5. Build HTML template with dynamic data
  const mailOptions = {
    from: emailConfig.emailUserName,
    to: email,
    subject: "Your Login OTP Code",
    text: `Your one-time login code is: ${otp}. It will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center;">
          <img src="${siteConfig.logo}" alt="${
      siteConfig.name
    } Logo" style="height: 50px; margin-bottom: 10px;" />
          <h2 style="color: #4C924D;">${siteConfig.name} - OTP Verification</h2>
        </div>
        <p>Hello,</p>
        <p>Your one-time login code is:</p>
        <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #333; text-align: center;">
          ${otp}
        </div>
        <p>This code will expire in 5 minutes. If you didn’t request this, please ignore this email.</p>
        <hr style="margin: 30px 0;" />
        <div style="font-size: 14px; color: #555;">
          <p><strong>Contact:</strong></p>
          <p>📞 ${contactInfo.phone}</p>
          <p>📧 ${contactInfo.email}</p>
          <p>📍 ${contactInfo.address}</p>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 20px; text-align: center;">
          &copy; ${new Date().getFullYear()} ${siteConfig.copyRights.trim()}
        </p>
      </div>
    `,
  };

  // 6. Send email
  await transporter.sendMail(mailOptions);
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // 2. Generate 6-digit reset code and expiry
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // 3. Update user record
    await prisma.user.update({
      where: { email },
      data: {
        resetCode,
        resetCodeExpiration,
      },
    });

    // 4. Build HTML message
    const html = `
      <p>Hi ${user.username || "there"},</p>
      <p>You requested to reset your password. Use the code below to continue:</p>
      <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #333; text-align: center;">
        ${resetCode}
      </div>
      <p>This code is valid for 10 minutes.</p>
      <p>If you didn’t request this, please ignore this email.</p>
    `;

    // 5. Send the email using sendEmail util
    await sendEmail({
      to: email,
      subject: "Password Reset Code",
      html,
    });

    return res.status(200).json({
      success: true,
      message: "Reset code sent to your email.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res.status(500).json({
      success: false,
      message:
        error.message || "An error occurred while requesting password reset.",
    });
  }
};

export const resetPassword = async (req, res) => {
  const { email, resetCode, newPassword, confirmPassword } = req.body;

  try {
    // Validate required fields
    const missingFields = [];
    if (!email) missingFields.push("Email");
    if (!resetCode) missingFields.push("Code");
    if (!newPassword) missingFields.push("New password");
    if (!confirmPassword) missingFields.push("Confirm password");

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingFields.join(", ")} field(s) are required.`,
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Password not match. Please try again.",
      });
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Check reset code and expiration
    if (user.resetCode !== resetCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code.",
      });
    }

    if (user.resetCodeExpiration && user.resetCodeExpiration < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Reset code has expired.",
      });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        resetCode: null,
        resetCodeExpiration: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during password reset.",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const {
      isEmailNotificationEnabled,
      isOrderNotificationEnabled,
      isStockAlertEnabled,
      isSystemAlertEnabled,
      ...otherFields
    } = req.body;
    const email = req.email;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email!",
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    const updatedFields = {
      ...otherFields,
      ...(typeof isEmailNotificationEnabled !== "undefined" && {
        isEmailNotificationEnabled:
          isEmailNotificationEnabled === true ||
          isEmailNotificationEnabled === "true",
      }),
      ...(typeof isOrderNotificationEnabled !== "undefined" && {
        isOrderNotificationEnabled:
          isOrderNotificationEnabled === true ||
          isOrderNotificationEnabled === "true",
      }),
      ...(typeof isStockAlertEnabled !== "undefined" && {
        isStockAlertEnabled:
          isStockAlertEnabled === true || isStockAlertEnabled === "true",
      }),

      ...(typeof isSystemAlertEnabled !== "undefined" && {
        isSystemAlertEnabled:
          isSystemAlertEnabled === true || isSystemAlertEnabled === "true",
      }),
    };

    // Handle image upload
    if (req.file) {
      try {
        if (user.avatarPublicId) {
          await cloudinary.uploader.destroy(user.avatarPublicId);
        }

        const cloudinaryResult = req.file;
        updatedFields.avatar = cloudinaryResult.path;
        updatedFields.avatarPublicId = cloudinaryResult.filename;
      } catch (imageError) {
        return res.status(500).json({
          success: false,
          message: "Image update failed.",
          error: imageError.message,
        });
      }
    }

    await prisma.user.update({
      where: { email },
      data: updatedFields,
    });

    res.status(200).json({
      success: true,
      message: "User profile updated successfully.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Error updating profile.",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, passwordConfirmation } = req.body;
    const email = req.email;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email!",
      });
    }

    if (!oldPassword || !newPassword || !passwordConfirmation) {
      return res.status(400).json({
        success: false,
        message: "All fields are required!",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long!",
      });
    }

    if (newPassword !== passwordConfirmation) {
      return res.status(400).json({
        success: false,
        message: "New password and confirmation do not match!",
      });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found!",
      });
    }

    // Check old password
    const isMatch = bcrypt.compareSync(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old password is incorrect!",
      });
    }

    // Hash and update new password
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(newPassword, salt);

    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        updatedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Error changing password.",
    });
  }
};

export const googleLogin = async (req, res) => {
  try {
    // Email and role are available on req.user from passport
    const { email, role = "user", id, username, status } = req.user;

    if (!email) {
      return res.redirect(
        `${process.env.FRONTEND_LINK}/login?error=no_email_found`
      );
    }

    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Step 1: Create session
    const session = await prisma.session.create({
      data: {
        userId: id,
        token: "temp",
        deviceInfo,
        expiresAt,
      },
    });

    const token = jwt.sign(
      {
        userId: id,
        email: email,
        sessionId: session.id,
        role: role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "3d",
      }
    );

    // Step 3: Update session with real token
    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });

    const frontendURL = `${process.env.FRONTEND_LINK}/auth/google/callback?token=${token}&role=${role}&id=${id}&username=${username}&status=${status}&email=${email}`;
    res.redirect(frontendURL);
  } catch (error) {
    console.error("Google login error:", error);
    res.redirect(`${process.env.FRONTEND_LINK}/login?error=login_failed`);
  }
};

export const verify2FA = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user)
      return res
        .status(404)
        .json({ message: "User not found. Please register first." });

    if (user.status !== "active")
      return res.status(403).json({ message: `Account is ${user.status}.` });

    if (!user.twoFactorTempToken || !user.twoFactorTempExp)
      return res.status(400).json({ message: "Invalid OTP request." });

    const isOtpExpired = new Date() > new Date(user.twoFactorTempExp);
    const isOtpInvalid = user.twoFactorTempToken !== otp;

    if (isOtpInvalid || isOtpExpired) {
      return res.status(401).json({ message: "Invalid or expired OTP." });
    }

    // Clear OTP fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorTempToken: null,
        twoFactorTempExp: null,
      },
    });

    // Create session and JWT (same as loginUser)
    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: "temp",
        deviceInfo,
        expiresAt,
      },
    });

    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        sessionId: session.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    await prisma.session.update({
      where: { id: session.id },
      data: { token: jwtToken },
    });

    const { id, username, role, status, createdAt, isTwoFactorEnabled } = user;

    res.status(200).json({
      success: true,
      message: "Login successful.",
      payload: {
        _id: id,
        name: username,
        email,
        token: jwtToken,
        role,
        status,
        createdAt,
        isTwoFactorEnabled,
      },
      session: {
        id: session.id,
        deviceInfo: session.deviceInfo,
        isActive: session.isActive,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error("2FA Verify Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error during 2FA verification.",
    });
  }
};

export const setup2FA = async (req, res) => {
  const userId = req.userId;

  if (!userId)
    return res.status(400).json({ message: "User ID not found from token." });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "User not found." });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isTwoFactorEnabled: true,
    },
  });

  res.json({ success: true, message: "Setup 2FA successful" });
};

export const remove2FA = async (req, res) => {
  const userId = req.userId;

  if (!userId)
    return res.status(400).json({ message: "User ID not found from token." });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ message: "User not found." });

  const secret = speakeasy.generateSecret({
    name: `Ultra E-commerce (${user.email})`,
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isTwoFactorEnabled: false,
      twoFactorTempToken: null,
      twoFactorTempExp: null,
    },
  });

  res.json({ success: true, message: "Remove 2FA successful" });
};

export const getUserProfile = async (req, res, next) => {
  const email = req.email;
  const token = req.token;

  if (!email) {
    return res.status(400).json({ message: "Email not found." });
  }

  if (!token) {
    return res.status(400).json({ message: "Token not found in token." });
  }

  try {
    // ✅ Correct query format
    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const session = await prisma.session.findFirst({
      where: { token },
    });

    if (!session || !session.isActive) {
      return next(createError(403, "Session is expired!"));
    }

    const {
      password,
      resetCode,
      resetCodeExpiration,
      twoFactorTempToken,
      twoFactorTempExp,
      ...userData
    } = user;

    res.status(200).json({
      success: true,
      message: "User profile retrieved successfully.",
      payload: userData,
      session: {
        id: session.id,
        deviceInfo: session.deviceInfo,
        isActive: session.isActive,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({
      success: false,
      message:
        error.message || "An error occurred while fetching the user profile.",
    });
  }
};

export const toggleUserStatus = async (req, res) => {
  const { status, userId } = req.body;
  const adminId = req.userId;
  const adminRole = req.role;

  // Admin access check
  if (!adminId || (adminRole !== "admin" && adminRole !== "super_admin")) {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }

  // Input validation
  if (!userId) {
    return res.status(400).json({ error: "User ID is required!" });
  }

  if (!["active", "inactive"].includes(status)) {
    return res.status(400).json({ error: "Invalid status!" });
  }

  try {
    // Fetch target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { sessions: true },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found!" });
    }

    // Prevent self-action
    if (adminId === userId) {
      return res
        .status(400)
        .json({ error: "You cannot change your own status." });
    }

    // Prevent action on other admins
    if (targetUser.role === adminRole) {
      return res
        .status(400)
        .json({ error: "You cannot access another admin account." });
    }

    // Update user status
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status },
    });

    // Remove sessions if inactive
    if (status === "inactive") {
      await prisma.session.deleteMany({ where: { userId } });
    }

    // Send styled email notification
    await sendEmail({
      to: targetUser.email,
      subject: `Your Ultra E-commerce Account Has Been ${
        status === "inactive" ? "In-Active" : "Activated"
      }`,
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #4C924D; margin-bottom: 20px;">Account Status Updated</h2>
            <p style="font-size: 15px; color: #333;">Dear ${
              targetUser.username
            },</p>
            <p style="font-size: 15px; color: #333;">
              Your Ultra E-commerce account has been <strong style="text-transform: uppercase;">${status}</strong> by an administrator.
            </p>
            ${
              status === "inactive"
                ? `<p style="font-size: 15px; color: #333;">If you believe this was a mistake, please contact support.</p>`
                : `<p style="font-size: 15px; color: #333;">You may now log in and continue using your account as usual.</p>`
            }
            <p style="font-size: 15px; color: #333;">Thank you,<br><strong>The Ultra E-commerce Team</strong></p>
          </div>
        </div>
      `,
    });

    return res.json({
      message: `User status updated to ${status} and email sent.`,
      user: updatedUser,
    });
  } catch (err) {
    console.error("Status update error:", err);
    return res.status(500).json({ error: "Something went wrong!" });
  }
};
