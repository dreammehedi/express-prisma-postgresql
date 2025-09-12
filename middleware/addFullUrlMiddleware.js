import { configDotenv } from "dotenv";
configDotenv();

function addFullUrlMiddleware(req, res, next) {
  const baseUrl =
    process.env.SERVER_LINK || `${req.protocol}://${req.get("host")}`;

  const originalJson = res.json;

  res.json = function (data) {
    function addFullUrlToImages(item) {
      if (item && typeof item === "object") {
        for (const key in item) {
          const value = item[key];

          // Handle direct string image fields
          const imageFields = [
            "image",
            "authorImage",
            "ogImage",
            "twitterImage",
            "avatar",
            "logo",
            "favicon",
          ];

          if (
            imageFields.includes(key) &&
            typeof value === "string" &&
            !value.startsWith("http")
          ) {
            item[key] = `${baseUrl}/${value}`;
          }

          // Handle array of image objects with 'url'
          if (key === "images" && Array.isArray(value)) {
            value.forEach((imgObj) => {
              if (
                imgObj?.url &&
                typeof imgObj.url === "string" &&
                !imgObj.url.startsWith("http")
              ) {
                imgObj.url = `${baseUrl}/${imgObj.url}`;
              }
            });
          }

          // Recursively go deeper
          if (typeof value === "object" && value !== null) {
            addFullUrlToImages(value);
          }
        }
      }
    }

    // Apply to response
    if (data && data.data) {
      if (Array.isArray(data.data)) {
        data.data.forEach(addFullUrlToImages);
      } else {
        addFullUrlToImages(data.data);
      }
    }

    return originalJson.call(this, data);
  };

  next();
}

export { addFullUrlMiddleware };
