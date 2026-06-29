/**
 * Build pagination metadata from query params.
 *
 * @param {object} query - req.query (page, limit)
 * @param {number} total - total document count
 * @returns {{ skip: number, limit: number, page: number, totalPages: number, total: number }}
 */
const paginate = (query, total) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  const totalPages = Math.ceil(total / limit) || 1;
  const skip = (page - 1) * limit;

  return { skip, limit, page, totalPages, total };
};

module.exports = paginate;
