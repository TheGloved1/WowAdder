import { Input } from '@/components/ui/input';
import { useEffect, useRef, useState } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

function getPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }
  const pages: (number | 'ellipsis')[] = [0];
  if (currentPage > 3) pages.push('ellipsis');
  for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages - 2, currentPage + 1); i++) {
    pages.push(i);
  }
  if (currentPage < totalPages - 4) pages.push('ellipsis');
  pages.push(totalPages - 1);
  return pages;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className = '' }: PaginationProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleEditSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const input = inputRef.current;
    if (!input) {
      submittingRef.current = false;
      return;
    }
    const val = Number(input.value);
    if (isNaN(val) || val < 1 || val > totalPages) {
      setEditing(false);
      submittingRef.current = false;
      return;
    }
    onPageChange(val - 1);
    setEditing(false);
    submittingRef.current = false;
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }

  const pages = getPageNumbers(currentPage, totalPages);
  const items: React.JSX.Element[] = [];
  let jumpShown = false;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    if (p === 'ellipsis' && !jumpShown) {
      jumpShown = true;
      items.push(
        <span key={`ellipsis-${i}`} className='text-wow-text-muted px-1 text-xs'>
          ...
        </span>,
      );
    } else if (p === 'ellipsis') {
      items.push(
        <span key={`ellipsis2-${i}`} className='text-wow-text-muted px-1 text-xs'>
          ...
        </span>,
      );
    } else if (p === currentPage && editing) {
      items.push(
        <Input
          key={`edit-${p}`}
          ref={inputRef}
          type='number'
          min={1}
          max={totalPages}
          defaultValue={p + 1}
          onKeyDown={handleInputKeyDown}
          onBlur={handleEditSubmit}
          className='h-8 w-10 [appearance:textfield] text-center text-xs [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
        />,
      );
    } else {
      items.push(
        p === currentPage ?
          <button
            key={p}
            onClick={() => setEditing(true)}
            title='Click to jump to page'
            className='border-wow-gold bg-wow-gold text-wow-bg font-wow-heading h-8 w-8 cursor-pointer rounded-sm border text-xs transition-colors'
          >
            {p + 1}
          </button>
        : <button
            key={p}
            onClick={() => onPageChange(p)}
            className='border-wow-border-light bg-wow-panel text-wow-text-dim hover:border-wow-border-gold hover:text-wow-text h-8 w-8 cursor-pointer rounded-sm border text-xs transition-colors'
          >
            {p + 1}
          </button>,
      );
    }
  }

  return (
    <div className={`flex items-center gap-0.5 pb-4 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 0}
        className='bg-wow-panel border-wow-border-light hover:border-wow-border-gold text-wow-text-dim hover:text-wow-text rounded-sm border px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40'
      >
        Prev
      </button>
      {items}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages - 1}
        className='bg-wow-panel border-wow-border-light hover:border-wow-border-gold text-wow-text-dim hover:text-wow-text rounded-sm border px-2.5 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40'
      >
        Next
      </button>
    </div>
  );
}
