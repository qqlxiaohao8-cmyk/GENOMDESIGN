import React from 'react';

/**
 * Feed layout: CSS grid (row-first, 先横后竖) or CSS columns masonry (column-first).
 *
 * - Grid: pass `className` with `grid`, e.g. `grid grid-cols-2 md:grid-cols-4`
 * - Columns: `columns-2 md:columns-4` (legacy waterfall)
 *
 * @param {{ columns?: 1|2|3|4, gap?: string, className?: string, children: React.ReactNode }} props
 */
export default function MasonryColumns({ columns = 2, gap = '1rem', className = '', children }) {
  const useGrid = /\bgrid\b/.test(className);

  if (useGrid) {
    return (
      <div className={className} style={{ gap }}>
        {children}
      </div>
    );
  }

  const legacyClass =
    columns === 1 ? 'columns-1' : columns === 3 ? 'columns-3' : columns === 4 ? 'columns-4' : 'columns-2';
  return (
    <div className={className || legacyClass} style={{ columnGap: gap }}>
      {React.Children.map(children, (child) =>
        child ? (
          <div className="w-full" style={{ breakInside: 'avoid', marginBottom: gap }}>
            {child}
          </div>
        ) : null,
      )}
    </div>
  );
}
