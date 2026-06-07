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
    <header className={`space-y-2 ${className}`}>
      {overline && (
        <div className="type-overline">{overline}</div>
      )}
      <div className="flex items-start justify-between gap-4 md:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <h1 className="type-h1">{title}</h1>
          {description && (
            <p className="type-caption max-w-lg leading-relaxed">{description}</p>
          )}
        </div>
        {children ? (
          <div className="shrink-0 pt-1">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
