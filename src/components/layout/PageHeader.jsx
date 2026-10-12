import React from 'react';

/**
 * 主导航页统一页头：可选说明，无字标
 */
export default function PageHeader({
  title,
  description,
  overline,
  index,
  children,
  className = '',
}) {
  const hasCopy = Boolean(overline || index || description);
  const hasRow = hasCopy || Boolean(children);

  return (
    <header className={`zen-page-heading ${className}`}>
      {title ? <h1 className="sr-only">{title}</h1> : null}
      {overline ? (
        <div className="type-overline">{overline}</div>
      ) : null}
      {hasRow ? (
        <div className="flex items-center justify-between gap-4 md:gap-6">
          <div className="zen-page-heading__text">
            {index ? (
              <span className="type-index block" aria-hidden>
                {String(index).replace(/\.?$/, '.')}
              </span>
            ) : null}
            {description ? (
              <p className="zen-catalog mt-3 max-w-md">{description}</p>
            ) : null}
          </div>
          {children ? (
            <div className="shrink-0">{children}</div>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
