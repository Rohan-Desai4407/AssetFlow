const { paginationParams } = require('./helpers');

const parsePagination = (query) => {
  const params = paginationParams(query);
  return {
    page: params.page,
    pageSize: params.limit,
    offset: params.offset,
    limit: params.limit
  };
};

const buildPaginatedResult = (data, total, page, pageSize) => {
  return {
    data,
    total,
    page,
    pageSize
  };
};

module.exports = { parsePagination, buildPaginatedResult };
