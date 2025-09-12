import app from "./app.js";
import { prisma } from "./lib/prisma.js";
import { setupDynamicCronJob } from "./utils/cronManager.js";

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);

  // Handle Prisma errors
  if (err.code?.startsWith("P")) {
    return res.status(400).json({
      success: false,
      status: 400,
      message: "Database operation failed",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      status: 401,
      message: "Invalid token",
    });
  }

  const errorStatus = err.status || 500;
  const errorMessage = err.message || "Something went wrong!";

  return res.status(errorStatus).json({
    success: false,
    status: errorStatus,
    message: errorMessage,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: "Route not found",
  });
});

// Start server
const PORT = process.env.PORT || 8800;
const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  await setupDynamicCronJob();
});

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log("Received shutdown signal");
  server.close(async () => {
    console.log("Server closed");
    try {
      await prisma.$disconnect();
      console.log("Database connection closed");
      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown();
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (error) => {
  console.error("Unhandled Rejection:", error);
  gracefulShutdown();
});
