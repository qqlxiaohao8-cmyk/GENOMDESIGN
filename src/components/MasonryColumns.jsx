import React from 'react';

/**
 * CSS-columns masonry layout — no JavaScript height calculations needed.
 * Uses `break-inside-avoid` on each child to prevent card splits.
 *
 * @param {{ columns?: 1|2, gap?: string, children: React.ReactNode }} props
 */
export default function MasonryColumns({ columns = 2, gap = '1rem', children }) {
  const style = {
    columnCount: columns,
    columnGap: gap,
  };
  return (
    <div style={style}>
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
