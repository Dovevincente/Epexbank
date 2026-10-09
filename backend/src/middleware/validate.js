export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const result = await schema.safeParseAsync({
        body: req.body,
        params: req.params,
        query: req.query,
      });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Invalid request data",
          errors: result.error.flatten(),
        });
      }

      req.validated = result.data;

      next();
    } catch (error) {
      next(error);
    }
  };
};