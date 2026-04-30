export const notFound = (req, res) => {
  res.status(404).json({
    error: {
      message: `Route not found: ${req.method} ${req.path}`
    }
  });
};
