const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message.replace(/['"]/g, ""),
      }));
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid input payload provided.",
        details,
      });
    }

    req[source] = value;
    next();
  };
};

module.exports = validate;