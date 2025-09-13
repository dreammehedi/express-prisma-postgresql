// middleware/checkHeaders.js
import dotenv from "dotenv";
dotenv.config();

export function checkHeaders(req, res, next) {
  const skipPaths = ["/", "/health"];
  if (skipPaths.includes(req.path)) return next();

  const requestWith = req.headers["x-requested-with"];
  const apiKey = req.headers["x-api-key"];
  const expectedKey = process.env.SPECIAL_API_KEY;

  if (requestWith === "web" && apiKey === expectedKey) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "Client side is not allow",
  });
}
