'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileTableWrapperProps {
  children: ReactNode;
  mode?: 'card' | 'scroll';
  className?: string;
}

/**
 * Wrapper component that makes tables mobile-friendly
 *
 * @param mode - 'card' converts table to card layout on mobile (default)
 *               'scroll' enables horizontal scrolling on mobile
 *
 * Usage with 'card' mode:
 * <MobileTableWrapper>
 *   <table>
 *     <thead>...</thead>
 *     <tbody>
 *       <tr>
 *         <td data-label="Name">John</td>
 *         <td data-label="Email">john@example.com</td>
 *       </tr>
 *     </tbody>
 *   </table>
 * </MobileTableWrapper>
 *
 * Note: For 'card' mode, add data-label attribute to each <td> element
 */
export function MobileTableWrapper({
  children,
  mode = 'card',
  className
}: MobileTableWrapperProps) {
  return (
    <div className={cn(
      mode === 'card' ? 'mobile-table-card' : 'mobile-table-scroll',
      className
    )}>
      {children}
    </div>
  );
}
