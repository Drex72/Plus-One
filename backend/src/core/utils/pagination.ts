export interface PaginationQuery {
  page?: number | string;
  pageSize?: number | string;
}

export interface PaginationConfig {
  defaultPageSize?: number;
  maxPageSize?: number;
}

export interface NormalizedPagination {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
  rangeEnd: number;
}

export const normalizePagination = (
  query: PaginationQuery,
  config: PaginationConfig = { defaultPageSize: 20, maxPageSize: 100 },
): NormalizedPagination => {
  const pageNum = Number(query.page);
  const sizeNum = Number(query.pageSize);

  const page = Number.isFinite(pageNum) && pageNum > 0 ? pageNum : 1;
  const requestedSize = Number.isFinite(sizeNum) && sizeNum > 0 ? sizeNum : (config.defaultPageSize ?? 20);
  const pageSize = Math.min(requestedSize, config.maxPageSize ?? 100);

  const offset = (page - 1) * pageSize;
  const limit = pageSize;
  const rangeEnd = offset + limit - 1;

  return { page, pageSize, offset, limit, rangeEnd };
};
