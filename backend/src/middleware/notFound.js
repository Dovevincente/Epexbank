const notFound = (
  req,
  res,
) => {
  return res
    .status(404)
    .json({
      success: false,
      message: "Resource not found",
      path: req.originalUrl,
      method: req.method,
    });
};

export default notFound;

export {
  notFound,
};