import React from 'react';

/**
 * 主导航页统一页头：打字机序号 + 宋体标题
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
          {index ? (
            <span className="type-index block" aria-hidden>
              {String(index).replace(/\.?$/, '.')}
            </span>
          ) : null}
          <h1 className="type-h1 mt-2">{title}</h1>
          {description ? (
            <p className="zen-catalog mt-3 max-w-md">{description}</p>
          ) : null}
        </div>
        {children ? (
          <div className="shrink-0">{children}</div>
        ) : null}
      </div>
    </header>
  );
}
