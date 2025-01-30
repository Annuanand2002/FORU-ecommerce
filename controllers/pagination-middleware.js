// pagination.js

function paginate(totalItems, currentPage = 1, pageSize = 5, maxPages = 10) {
  const totalPages = Math.ceil(totalItems / pageSize);

  currentPage = Math.max(1, Math.min(currentPage, totalPages));

  let startPage, endPage;
  if (totalPages <= maxPages) {
      startPage = 1;
      endPage = totalPages;
  } else {
      const maxPagesBeforeCurrentPage = Math.floor(maxPages / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPages / 2) - 1;
      if (currentPage <= maxPagesBeforeCurrentPage) {
          startPage = 1;
          endPage = maxPages;
      } else if (currentPage + maxPagesAfterCurrentPage >= totalPages) {
          startPage = totalPages - maxPages + 1;
          endPage = totalPages;
      } else {
          startPage = currentPage - maxPagesBeforeCurrentPage;
          endPage = currentPage + maxPagesAfterCurrentPage;
      }
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize - 1, totalItems - 1);

  return {
      totalItems,
      currentPage,
      pageSize,
      totalPages,
      startPage,
      endPage,
      startIndex,
      endIndex,
      pages: Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i),
  };
}

module.exports = paginate;

