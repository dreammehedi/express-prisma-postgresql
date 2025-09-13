import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import path from "path";
import { fileURLToPath } from "url";
// Import routes
import passport from "./config/passport.config.js";
import { addFullUrlMiddleware } from "./middleware/addFullUrlMiddleware.js";
import { attachGlobalSettings } from "./middleware/attachGlobalSettings.js";
import { checkHeaders } from "./middleware/checkHeaders.js";
import { formatJsonResponse } from "./middleware/formatJsonResponse.js";
import {
  AuthenticationRouter,
  AuthRouter,
} from "./routes/auth/authentication.route.js";
import DatabaseBackupRouter from "./routes/other/databaseBackup.route.js";
import DynamicPageRouter from "./routes/other/dynamicPage.route.js";
import EmailConfigurationRouter from "./routes/other/emailConfiguration.route.js";
import OtherRouter from "./routes/other/other.route.js";
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_SECRET",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "ENCRYPTION_KEY",
  "ENCRYPTION_IV",
  "FRONTEND_LINK",
  "SERVER_LINK",
];

if (process.env.FILE_STORE_TYPE === "cloudinary") {
  requiredEnvVars.push(
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET"
  );
}

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Configure __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ✅ JSON/body parsers (after webhook)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Detect environment
const isProduction = process.env.NODE_ENV === "production";

// CORS configuration
const allowedOrigins = isProduction
  ? ["https://your-domain.com"]
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400, // 24 hours
  })
);
// Passport middleware
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(checkHeaders);
app.use(attachGlobalSettings);
app.use(formatJsonResponse);

// Home route
app.get("/", (req, res) => {
  res.render("index", {
    title: "Home",
    message: "Server Running...",
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// routes
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(addFullUrlMiddleware);
app.use("/api", OtherRouter);
app.use("/api/authentication", AuthenticationRouter);
app.use("/api/auth", AuthRouter);
app.use("/api", EmailConfigurationRouter);
app.use("/api", DatabaseBackupRouter);
app.use("/api", DynamicPageRouter);

export default app;
