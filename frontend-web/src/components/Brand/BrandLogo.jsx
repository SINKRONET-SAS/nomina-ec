import React from 'react';

const BRAND_NAME = 'SKNOMINA';
const BRAND_LOGO_SRC = '/icon-512.png';
const BRAND_LOGO_FALLBACK_SRC = '/icon.svg';

function BrandLogo({
  className = '',
  imageClassName = 'h-10 w-10',
  showText = true,
  textClassName = 'text-slate-950',
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <img
        alt="SKNOMINA"
        className={`shrink-0 rounded-xl object-cover shadow-sm ${imageClassName}`}
        onError={(event) => {
          if (!event.currentTarget.src.endsWith(BRAND_LOGO_FALLBACK_SRC)) {
            event.currentTarget.src = BRAND_LOGO_FALLBACK_SRC;
          }
        }}
        src={BRAND_LOGO_SRC}
      />
      {showText && (
        <span className={`truncate font-semibold ${textClassName}`}>
          {BRAND_NAME}
        </span>
      )}
    </span>
  );
}

export { BRAND_LOGO_FALLBACK_SRC, BRAND_LOGO_SRC, BRAND_NAME };
export default BrandLogo;
