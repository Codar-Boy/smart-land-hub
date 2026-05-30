/**
 * validateId middleware
 * Ensures :id route param is a positive integer.
 * Prevents NaN / negative IDs from reaching the database.
 */
module.exports = (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).send('Invalid ID.');
  }
  req.params.id = id; // replace with sanitized integer
  next();
};
