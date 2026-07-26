import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Componente unificado de paginación para tablas en SKNOMINA
 * @param {Object} props
 * @param {number} props.currentPage Página actual (1-based)
 * @param {number} props.totalPages Total de páginas calculadas
 * @param {number} props.pageSize Elementos por página
 * @param {number} props.totalItems Total de registros filtrados
 * @param {function(number): void} props.onPageChange Callback para cambio de página
 * @param {function(number): void} props.onPageSizeChange Callback para cambio de tamaño de página
 * @param {number[]} [props.pageSizeOptions=[10, 25, 50, 100]] Opciones de tamaño de página
 */
export default function TablePagination({
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generar lista de páginas visibles (máximo 5 botones numerados)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:px-6">
      {/* Información del rango */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 sm:text-sm">
        <span>
          Mostrando <span className="font-semibold text-slate-900">{startItem}</span> a{' '}
          <span className="font-semibold text-slate-900">{endItem}</span> de{' '}
          <span className="font-semibold text-slate-900">{totalItems}</span> registros
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            <label htmlFor="page-size-select" className="text-xs text-slate-500">
              Filas:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
              }}
              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 outline-none focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Controles de navegación */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Ir a la primera página */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Primera página"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Página anterior */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Botones de páginas numeradas */}
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`inline-flex h-8 min-w-[32px] items-center justify-center rounded-md px-2 text-xs font-semibold transition-colors ${
                pageNum === currentPage
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Página siguiente */}
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Página siguiente"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          {/* Ir a la última página */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Última página"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
