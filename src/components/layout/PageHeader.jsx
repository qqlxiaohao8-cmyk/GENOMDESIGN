import React from 'react';

/**
 * 主导航页统一页头：一级标题 + 可选眉题 / 说明 / 右侧附加内容
 */
export default function PageHeader({
  title,
  description,
  overline,
  index,
  children,
  className = '',
}) {
  return (
    <header className={`zen-page-heading ${className}`}>
      {overline ? (
        <div className="type-overline">{overline}</div>
      ) : null}
      <div className="flex items-start justify-between gap-4 md:gap-6">
        <div className="zen-page-heading__text">
          <div className="flex items-baseline gap-3">
            {index ? (
              <span className="type-index shrink-0" aria-hidden>
                {index}
              </span>
            ) : null}
            <h1 className="type-h1">{title}</h1>
          </div>
          {description ? (
            <p className="type-caption max-w-lg leading-relaxed">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="shrink-0">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
