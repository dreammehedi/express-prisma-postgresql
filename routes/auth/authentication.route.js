import express from "express";
import passport from "../../config/passport.config.js";
import { upload } from "../../config/upload.js";
import {
  changePassword,
  forgotPassword,
  getUserProfile,
  googleLogin,
  loginUser,
  logout,
  registerUser,
  remove2FA,
  resetPassword,
  setup2FA,
  updateProfile,
  verify2FA,
} from "../../controllers/auth/authentication.controller.js";
import { verifyToken } from "../../middleware/verifyToken.js";
const AuthenticationRouter = express.Router();
const AuthRouter = express.Router();

AuthenticationRouter.get("/profile", verifyToken, getUserProfile);
AuthenticationRouter.post("/register", upload.none(), registerUser);

AuthenticationRouter.post("/login", upload.none(), loginUser);
AuthenticationRouter.post("/setup-2fa", verifyToken, upload.none(), setup2FA);
AuthenticationRouter.post("/remove-2fa", verifyToken, upload.none(), remove2FA);
AuthenticationRouter.post("/verify-2fa", upload.none(), verify2FA);
AuthenticationRouter.post("/forgot-password", upload.none(), forgotPassword);
AuthenticationRouter.post("/reset-password", upload.none(), resetPassword);
AuthenticationRouter.post("/logout", upload.none(), verifyToken, logout);
AuthenticationRouter.put(
  "/update-profile",
  verifyToken,
  upload.single("avatar"),
  updateProfile
);
AuthenticationRouter.put(
  "/change-password",
  verifyToken,
  upload.none(),
  changePassword
);

// Initiate Google login
AuthRouter.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Handle Google callback
AuthRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_LINK}/login`,
  }),
  googleLogin
);

export { AuthenticationRouter, AuthRouter };
