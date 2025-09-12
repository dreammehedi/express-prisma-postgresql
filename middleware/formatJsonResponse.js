// middleware/formatJsonResponse.js
import { formatDatesInObject } from "../utils/formatResponseWithDates.js";

export const formatJsonResponse = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (body) {
    if (body?.data && req.globalSettings) {
      body.data = formatDatesInObject(
        body.data,
        req.globalSettings.timezone,
        req.globalSettings.dateFormat
      );
    }
    return originalJson.call(this, body);
  };

  next();
};
