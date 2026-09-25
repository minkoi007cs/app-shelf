import React from 'react';

export interface FilterOption {
  key: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
}

interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  sortBy?: string;
  onSortByChange?: (sort: string) => void;
  sortOptions?: { label: string; value: string }[];
  onClearFilters?: () => void;
  actions?: React.ReactNode;
}

export const Toolbar = React.memo(function Toolbar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  sortBy,
  onSortByChange,
  sortOptions = [],
  onClearFilters,
  actions,
}: ToolbarProps) {
  const showSort = Boolean(sortBy !== undefined && onSortByChange && sortOptions.length > 0);

  return (
    <div className="toolbar-container">
      <div className="toolbar-left">
        <div className="search-input-wrapper">
          <input
            type="text"
            className="input-field"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        {filters.map((f) => (
          <select
            key={f.key}
            className="select-field"
            value={f.value}
            onChange={(e) => f.onChange(e.target.value)}
          >
            {f.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ))}

        {showSort && (
          <select
            className="select-field"
            value={sortBy}
            onChange={(e) => onSortByChange!(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {onClearFilters && (
          <button className="btn btn-secondary btn-small" onClick={onClearFilters}>
            Clear Filters
          </button>
        )}
      </div>

      {actions && <div className="toolbar-right">{actions}</div>}
    </div>
  );
});
