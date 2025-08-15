import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { parseISO, format } from "date-fns";

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Format a date string or Date object to DD-MM-YYYY
export function formatDateDDMMYYYY(date) {
  if (!date) return '';
  let d = date;
  if (typeof date === 'string') {
    // Try ISO first
    d = parseISO(date);
    if (isNaN(d)) {
      // Try DD-MM-YYYY or MM-DD-YYYY
      const parts = date.split('-');
      if (parts.length === 3) {
        const n1 = Number(parts[0]);
        const n2 = Number(parts[1]);
        const year = Number(parts[2]);
        if (n1 > 12) {
          // DD-MM-YYYY
          d = new Date(year, n2 - 1, n1);
        } else if (n2 > 12) {
          // MM-DD-YYYY
          d = new Date(year, n1 - 1, n2);
        } else {
          // Default to DD-MM-YYYY
          d = new Date(year, n2 - 1, n1);
        }
      } else {
        d = new Date(date);
      }
    }
  }
  if (!(d instanceof Date) || isNaN(d)) return '';
  return format(d, 'dd-MM-yyyy');
}
