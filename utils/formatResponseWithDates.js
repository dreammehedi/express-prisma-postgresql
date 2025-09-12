import moment from "moment-timezone";

export const formatDatesInObject = (
  obj,
  timezone = "UTC",
  format = "YYYY-MM-DD"
) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => formatDatesInObject(item, timezone, format));
  }

  if (obj && typeof obj === "object") {
    const newObj = {};
    for (const key in obj) {
      const value = obj[key];

      if (value instanceof Date) {
        newObj[key] = moment(value).tz(timezone).format(format);
      } else if (Array.isArray(value) || typeof value === "object") {
        newObj[key] = formatDatesInObject(value, timezone, format);
      } else {
        newObj[key] = value;
      }
    }
    return newObj;
  }

  return obj;
};
