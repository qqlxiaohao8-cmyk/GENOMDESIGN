import React from 'react';

/**
 * App chrome: top header, left sidebar + main column (children), optional fixed mobile bar.
 * Pass main + footer together as children if footer should sit under the scroll area in the main column.
 */
export default function ColorHuntShell({ header, sidebar, children, mobileNav }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {header}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-row overflow-hidden">
          {sidebar}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      </div>
      {mobileNav}
    </div>
  );
}
