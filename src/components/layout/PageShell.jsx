import React from 'react';
import PageHeader from './PageHeader';
import PaperDustLayer from './PaperDustLayer';

/**
 * 主导航页统一骨架：固定页头（可选说明 + 浮动纸尘）+ 可滚动正文。
 */
export default function PageShell({
  title,
  description,
  overline,
  index,
  headerAside,
  headerExtra,
  children,
  bodyClassName = 'zen-page-body',
  className = '',
}) {
  const compact = !overline && !index && !description && !headerAside;

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent ${className}`}>
      <div className={`zen-page-header relative z-40 shrink-0 ${compact ? 'zen-page-header--compact' : ''}`}>
        <PaperDustLayer />
        <div className="relative z-[1]">
          <PageHeader
            title={title}
            description={description}
            overline={overline}
            index={index}
          >
            {headerAside}
          </PageHeader>
          {headerExtra ? (
            <div className="zen-page-header-extra">{headerExtra}</div>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
        <div className={`${bodyClassName} min-h-full`}>{children}</div>
      </div>
    </div>
  );
}
