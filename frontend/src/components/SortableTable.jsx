import { useState, useMemo } from 'react';
import './SortableTable.css';

function SortableTable({
  columns,
  data,
  onRowClick,
  searchable = false,
  searchPlaceholder = 'Search...',
  searchKeys = [], // Keys to search in (defaults to all column keys)
  pagination = false,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyMessage = 'No data available'
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  const handleSort = (key, sortType = 'string') => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction, sortType });
  };

  // Get the keys to search in
  const getSearchKeys = () => {
    if (searchKeys.length > 0) return searchKeys;
    return columns.map(col => col.key);
  };

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;

    const keys = getSearchKeys();
    const term = searchTerm.toLowerCase().trim();

    return data.filter(row => {
      return keys.some(key => {
        let value = row[key];

        // Handle nested properties
        if (key.includes('.')) {
          const parts = key.split('.');
          value = parts.reduce((obj, k) => obj?.[k], row);
        }

        if (value == null) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, columns]);

  // Sort the filtered data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle nested properties (e.g., 'user.name')
      if (sortConfig.key.includes('.')) {
        const keys = sortConfig.key.split('.');
        aValue = keys.reduce((obj, key) => obj?.[key], a);
        bValue = keys.reduce((obj, key) => obj?.[key], b);
      }

      // Handle null/undefined values
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Sort based on type
      switch (sortConfig.sortType) {
        case 'number':
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
          break;
        case 'date':
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
          break;
        case 'boolean':
          aValue = aValue ? 1 : 0;
          bValue = bValue ? 1 : 0;
          break;
        default:
          // String comparison (case-insensitive)
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate the sorted data
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;

    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, pagination, currentPage, itemsPerPage]);

  // Calculate pagination info
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startItem = sortedData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, sortedData.length);

  // Reset to page 1 when search changes
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Handle page size change
  const handlePageSizeChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span className="sort-icon">⇅</span>;
    }
    return sortConfig.direction === 'asc'
      ? <span className="sort-icon active">↑</span>
      : <span className="sort-icon active">↓</span>;
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="sortable-table-container">
      {/* Search Bar */}
      {searchable && (
        <div className="table-search">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={handleSearchChange}
            className="table-search-input"
          />
          {searchTerm && (
            <button
              className="search-clear"
              onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
              type="button"
            >
              ×
            </button>
          )}
          <span className="search-results-count">
            {filteredData.length} {filteredData.length === 1 ? 'result' : 'results'}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="table sortable-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => column.sortable !== false && handleSort(column.key, column.sortType)}
                  className={column.sortable !== false ? 'sortable' : ''}
                  style={column.width ? { width: column.width } : {}}
                >
                  {column.label}
                  {column.sortable !== false && getSortIcon(column.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={onRowClick ? 'clickable' : ''}
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty">
                    <p>{searchTerm ? 'No matching results found' : emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && sortedData.length > 0 && (
        <div className="table-pagination">
          <div className="pagination-info">
            <span>Showing {startItem}-{endItem} of {sortedData.length}</span>
            <select
              value={itemsPerPage}
              onChange={handlePageSizeChange}
              className="page-size-select"
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </div>

          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="First page"
            >
              ««
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="pagination-btn"
              title="Previous page"
            >
              «
            </button>

            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
              ) : (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                >
                  {page}
                </button>
              )
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              title="Next page"
            >
              »
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
              title="Last page"
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SortableTable;
