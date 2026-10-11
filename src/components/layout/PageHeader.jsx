import React from 'react';
import sekongLogo from '../../assets/sekong-mark.png';

/**
 * 主导航页统一页头：色空字标 + 可选说明
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
      <div className="flex items-center justify-between gap-4 md:gap-6">
        <div className="zen-page-heading__text">
          {index ? (
            <span className="type-index block" aria-hidden>
              {String(index).replace(/\.?$/, '.')}
            </span>
          ) : null}
          <h1 className={index ? 'mt-2' : ''}>
            {title ? <span className="sr-only">{title}</span> : null}
            <img
              src={sekongLogo}
              alt={title ? '' : '色空'}
              className="sekong-header-logo"
              draggable={false}
            />
          </h1>
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
