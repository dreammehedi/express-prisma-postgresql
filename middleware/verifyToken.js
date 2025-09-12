import jwt from "jsonwebtoken";
import { createError } from "../utils/error.js";

export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return next(createError(401, "You are not authenticated!"));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(createError(403, "Token is not valid!"));
    }
    req.userId = decoded.userId;
    req.email = decoded.email;
    req.role = decoded.role;
    req.token = token;
    req.sessionId = decoded.sessionId;
    next();
  });
};
