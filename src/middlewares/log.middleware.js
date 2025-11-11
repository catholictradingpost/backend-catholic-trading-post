import Log from "../models/log.model.js";

export const logAction = (action, resource) => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          await Log.create({
            action,
            resource,
            user: req.userId,
          });
          console.log(`Action logged: ${action} on ${resource}`);
        } catch (error) {
          console.error("Error saving log:", error.message);
        }
      }
    });

    next();
  };
};
