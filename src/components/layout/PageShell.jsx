import React from 'react';
import PageHeader from './PageHeader';

/**
 * 主导航页统一骨架：固定页头（标题区 + 可选扩展区）+ 可滚动正文。
 */
export default function PageShell({
  title,
  description,
  overline,
  headerAside,
  headerExtra,
  children,
  bodyClassName = 'zen-page-body',
  className = '',
}) {
  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-white ${className}`}>
      <div className="zen-page-header z-40 shrink-0">
        <PageHeader title={title} description={description} overline={overline}>
          {headerAside}
        </PageHeader>
        {headerExtra ? (
          <div className="zen-page-header-extra">{headerExtra}</div>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className={bodyClassName}>{children}</div>
      </div>
    </div>
  );
}
