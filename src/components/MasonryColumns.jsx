import React from 'react';

/**
 * CSS-columns masonry layout — no JavaScript height calculations needed.
 * Uses `break-inside-avoid` on each child to prevent card splits.
 *
 * Prefer `className` for responsive column counts, e.g. `columns-2 md:columns-4`.
 * Legacy `columns` prop still works when `className` is omitted.
 *
 * @param {{ columns?: 1|2|3|4, gap?: string, className?: string, children: React.ReactNode }} props
 */
export default function MasonryColumns({ columns = 2, gap = '1rem', className = '', children }) {
  const legacyClass =
    columns === 1 ? 'columns-1' : columns === 3 ? 'columns-3' : columns === 4 ? 'columns-4' : 'columns-2';
  const style = { columnGap: gap };
  return (
    <div className={className || legacyClass} style={style}>
      {React.Children.map(children, (child) =>
        child ? (
          <div style={{ breakInside: 'avoid', marginBottom: gap }}>
            {child}
          </div>
        ) : null
      )}
    </div>
  );
}
