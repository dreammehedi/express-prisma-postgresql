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
import { sendVerificationEmail } from "../../utils/mailer.js";

const CLIENT_URL = process.env.FRONTEND_LINK;

export const registerUser = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    // Validate required fields
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
    const existingUser = await prisma.user.findFirst({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already registered with this email.",
      });
    }

    const hashedPassword = bcrypt.hashSync(password, bcrypt.genSaltSync(10));

    // Generate email verification token
    const emailToken = crypto.randomBytes(32).toString("hex");
    const emailTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create new user (status pending)
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: "user",
        status: "pending",
        emailVerificationToken: emailToken,
        emailVerificationExpires: emailTokenExpiry,
        avatar: "",
        avatarPublicId: "",
      },
    });

    // Send verification email
    await sendVerificationEmail(newUser.email, emailToken, CLIENT_URL);

    // Create session (temporary token)
    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    await prisma.session.create({
      data: {
        userId: newUser.id,
        token: "temp",
        deviceInfo,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      success: true,
      message:
        "User registered successfully. Please check your email to verify your account.",
      payload: {
        _id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status,
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

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required." });

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Ensure email is verified
    if (user.status !== "active")
      return res.status(403).json({
        message:
          "Your email is not verified. Please check your inbox and verify your email before logging in.",
      });

    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(401).json({ message: "Invalid email or password." });

    // Handle 2FA if enabled
    if (user.isTwoFactorEnabled) {
      const otp = crypto.randomInt(100000, 999999).toString();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorTempToken: otp,
          twoFactorTempExp: new Date(Date.now() + 5 * 60 * 1000), // 5 min expiry
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

    // Create session
    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: "temp",
        deviceInfo,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    // Generate JWT
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

    // Update session with real token
    await prisma.session.update({
      where: { id: session.id },
      data: { token: jwtToken },
    });

    // Return user info
    const {
      id,
      username,
      role,
      status,
      createdAt,
      isTwoFactorEnabled,
      avatar,
    } = user;

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
        avatar,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({
      message: error.message || "Server error during login.",
    });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) return res.status(400).send("Invalid token.");

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { gt: new Date() },
      },
    });

    if (!user) return res.status(404).json({ message: "User not found." });

    // Activate user and remove verification token
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        status: "active",
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId: updatedUser.id, email: updatedUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    // Update session with token
    const session = await prisma.session.findFirst({
      where: { userId: updatedUser.id },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { token: jwtToken },
      });
    }

    res.status(200).json({
      success: true,
      message: `Email verified successfully. You can now log in.`,
      token: jwtToken,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "An error occurred during email verification.",
    });
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

export const sendResetCode = async (email, code) => {
  const emailConfig = await prisma.emailConfiguration.findFirst();

  if (!emailConfig) {
    throw new Error("Email configuration not found.");
  }

  const decryptedPassword = decrypt(emailConfig.emailPassword);
  if (!decryptedPassword) {
    throw new Error("Failed to decrypt email password");
  }

  const transporter = nodemailer.createTransport({
    service: emailConfig.emailHost || "smtp.gmail.com",
    auth: {
      user: emailConfig.emailAddress,
      pass: decryptedPassword,
    },
    tls: {
      rejectUnauthorized: false, // 👉 SSL মিসম্যাচ ইগনোর করবে
    },
  });

  const mailOptions = {
    from: emailConfig.emailUserName,
    to: email,
    subject: "Your Password Reset Code",
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4C924D;">Reset Your Password</h2>
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the code below to proceed:</p>
      <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #333; text-align: center;">
        ${code}
      </div>
      <p>This code will expire in 10 minutes. If you didn't request a password reset, please ignore this email.</p>
      <p>Thanks,<br>The AksumBase Team</p>
    </div>
  `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new Error(`Could not send reset code email.`);
  }
};

async function sendOtpEmail(email, otp) {
  const emailConfig = await prisma.emailConfiguration.findFirst();

  if (!emailConfig) {
    throw new Error("Email configuration not found.");
  }

  const decryptedPassword = decrypt(emailConfig.emailPassword);
  if (!decryptedPassword) {
    throw new Error("Failed to decrypt email password");
  }

  const mailOptions = {
    from: emailConfig.emailUserName,
    to: email,
    subject: "Your Login OTP Code",
    text: `Your one-time login code is: ${otp}. It will expire in 5 minutes.`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
      <h2 style="color: #4C924D;">Your Login Verification Code</h2>
      <p>Hello,</p>
      <p>Your one-time login code is:</p>
      <div style="font-size: 24px; font-weight: bold; margin: 20px 0; color: #333; text-align: center;">
        ${otp}
      </div>
      <p>This code will expire in 5 minutes. If you didn’t request this, please ignore this email.</p>
      <p>Thanks,<br>The AksumBase Team</p>
    </div>
  `,
  };

  const transporter = nodemailer.createTransport({
    service: emailConfig.emailHost || "smtp.gmail.com",
    auth: {
      user: emailConfig.emailAddress,
      pass: decryptedPassword,
    },
    tls: {
      rejectUnauthorized: false, // 👉 SSL মিসম্যাচ ইগনোর করবে
    },
  });
  await transporter.sendMail(mailOptions);
}

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Generate a 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiration = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user with reset code and expiration
    await prisma.user.update({
      where: { email },
      data: {
        resetCode,
        resetCodeExpiration,
      },
    });

    // Send reset code via email
    await sendResetCode(email, resetCode);

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
    const { email, isNotificationEnabled, ...otherFields } = req.body;

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
      ...(typeof isNotificationEnabled !== "undefined" && {
        isNotificationEnabled:
          isNotificationEnabled === true || isNotificationEnabled === "true",
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
    const { oldPassword, newPassword, passwordConfirmation, email } = req.body;

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
    const { platform } = req.query;
    const { email, role = "user", id, username, status } = req.user;

    if (!email) {
      return res.redirect(
        `${process.env.FRONTEND_LINK}/login?error=no_email_found`
      );
    }

    const deviceInfo = `${req.headers["user-agent"]} | IP: ${req.ip}`;
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: id,
        token: "temp",
        deviceInfo,
        expiresAt,
      },
    });

    const token = jwt.sign(
      { userId: id, email, sessionId: session.id, role },
      process.env.JWT_SECRET,
      { expiresIn: "3d" }
    );

    await prisma.session.update({
      where: { id: session.id },
      data: { token },
    });

    // Redirect URLs
    const frontendURL = `${process.env.FRONTEND_LINK}/auth/google/callback?token=${token}&role=${role}&id=${id}&username=${username}&status=${status}&email=${email}`;

    // For mobile app, use deep linking scheme:
    const appURL = `${process.env.APP_LINK}://google-callback?token=${token}&role=${role}&id=${id}&username=${username}&status=${status}&email=${email}`;

    res.redirect(platform === "app" ? appURL : frontendURL);
  } catch (error) {
    console.error("Google login error:", error);
    const { platform } = req.params;
    if (platform === "app") {
      res.redirect(`${process.env.APP_LINK}://signin?error=login_failed`);
    } else {
      res.redirect(`${process.env.FRONTEND_LINK}/login?error=login_failed`);
    }
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
    name: `Aksumbase (${user.email})`,
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
  const { email } = req.params; // ✅ destructure email properly
  const token = req.token;

  console.log(token, "token");

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
      subject: `Your AksumBase Account Has Been ${
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
              Your AksumBase account has been <strong style="text-transform: uppercase;">${status}</strong> by an administrator.
            </p>
            ${
              status === "inactive"
                ? `<p style="font-size: 15px; color: #333;">If you believe this was a mistake, please contact support.</p>`
                : `<p style="font-size: 15px; color: #333;">You may now log in and continue using your account as usual.</p>`
            }
            <p style="font-size: 15px; color: #333;">Thank you,<br><strong>The AksumBase Team</strong></p>
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
