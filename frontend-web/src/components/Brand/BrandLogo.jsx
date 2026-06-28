import React from 'react';

const BRAND_NAME = 'SKNOMINA';
const BRAND_LOGO_SRC = '/brand/sinkronet-logo.jpg';

function BrandLogo({
  className = '',
  imageClassName = 'h-10 w-10',
  showText = true,
  textClassName = 'text-slate-950',
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <img
        alt="Sinkronet"
        className={`shrink-0 rounded-xl object-cover shadow-sm ${imageClassName}`}
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

export { BRAND_LOGO_SRC, BRAND_NAME };
export default BrandLogo;
