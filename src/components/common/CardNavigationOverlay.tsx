import { Link, type LinkProps } from 'react-router'
import { cn } from '../../utils/cn'

interface CardNavigationOverlayProps {
  to: LinkProps['to']
  label: string
  state?: LinkProps['state']
  className?: string
}

export function CardNavigationOverlay({
  to,
  label,
  state,
  className,
}: CardNavigationOverlayProps) {
  return (
    <Link
      to={to}
      state={state}
      aria-label={label}
      className={cn(
        'absolute inset-0 z-10 rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-600',
        className,
      )}
    />
  )
}
