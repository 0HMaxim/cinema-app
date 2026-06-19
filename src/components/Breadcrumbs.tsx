// src/components/Breadcrumbs.tsx
import { Link, useLocation } from 'react-router-dom'

interface BreadcrumbItem {
    label: string
    to?: string
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[]
    className?: string
}

const SEGMENT_MAP: Record<string, { label: string; to?: string }> = {
    movie:      { label: 'Фільми',     to: '/movies'  },
    movies:     { label: 'Фільми',     to: '/movies'  },
    cart:       { label: 'Кошик',      to: '/cart'    },
    cinema:     { label: 'Кінотеатри', to: '/cinemas' },
    cinemas:    { label: 'Кінотеатри', to: '/cinemas' },
    promotions: { label: 'Акції',      to: '/promotions' },
    about:      { label: 'Про нас',    to: '/about'   },
    admin:      { label: 'Адмін',      to: '/admin'   }, // ← добавлено
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    const location = useLocation()
    const resolvedItems: BreadcrumbItem[] = items ?? buildAutoItems(location.pathname)

    if (resolvedItems.length <= 1) return null

    return (
        <nav
            aria-label="breadcrumb"
            className={`flex items-center gap-1 flex-wrap text-sm py-6 ${className}`} // ← убрано "bg-"
        >
            {resolvedItems.map((item, i) => {
                const isLast = i === resolvedItems.length - 1
                return (
                    <span key={i} className="flex items-center gap-1 text-zinc-500">
                        {i > 0 && (
                            <span className="select-none text-xs text-zinc-700">›</span>
                        )}
                        {isLast ? (
                            <span className="text-white font-medium truncate max-w-[200px]">
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                to={item.to ?? '/'}
                                className="hover:text-white transition-colors duration-150"
                            >
                                {item.label}
                            </Link>
                        )}
                    </span>
                )
            })}
        </nav>
    )
}

function buildAutoItems(pathname: string): BreadcrumbItem[] {
    const segments = pathname.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = [{ label: 'Головна', to: '/' }]

    segments.forEach((seg, i) => {
        const mapped = SEGMENT_MAP[seg]
        const isLast = i === segments.length - 1

        if (mapped) {
            items.push(isLast ? { label: mapped.label } : { label: mapped.label, to: mapped.to })
        } else {
            if (!isLast) {
                const path = '/' + segments.slice(0, i + 1).join('/')
                items.push({ label: seg, to: path })
            }
        }
    })

    return items
}