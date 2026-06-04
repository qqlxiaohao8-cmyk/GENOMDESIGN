import React from 'react';

/**
 * 主导航页统一页头：一级标题 + 可选眉题 / 说明 / 右侧附加内容
 */
export default function PageHeader({
  title,
  description,
  overline,
  children,
  className = '',
}) {
  return (
    <header className={className}>
      {overline && (
        <div className="type-overline mb-1.5">{overline}</div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="type-h1">{title}</h1>
          {description && (
            <p className="type-caption mt-1 max-w-md">{description}</p>
          )}
        </div>
        {children ? (
          <div className="shrink-0">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
