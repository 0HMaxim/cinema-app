import { Link, useLocation } from 'react-router-dom'

interface BreadcrumbItem {
    label: string
    to?: string
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[]
    className?: string
}

// Маппинг сегмент URL → { label, linkTo }
// linkTo может отличаться от реального пути (movie → /movies)
const SEGMENT_MAP: Record<string, { label: string; to?: string }> = {
    movie:      { label: 'Фільми',      to: '/movies'  },
    movies:     { label: 'Фільми',      to: '/movies'  },
    cart:       { label: 'Кошик',       to: '/cart'  },
    cinema:     { label: 'Кінотеатри',  to: '/cinemas' },
    cinemas:    { label: 'Кінотеатри',  to: '/cinemas' },
    promotions: { label: 'Акції',       to: '/promotions' },
    about:      { label: 'Про нас',     to: '/about'   },
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    const location = useLocation()

    const resolvedItems: BreadcrumbItem[] = items ?? buildAutoItems(location.pathname)

    if (resolvedItems.length <= 1) return null

    return (
        <nav
            aria-label="breadcrumb"
            className={`flex  items-center gap-1 flex-wrap text-sm py-6 bg-  ${className}`}
        >

            {resolvedItems.map((item, i) => {
                const isLast = i === resolvedItems.length - 1
                return (
                    <span key={i} className="flex items-center gap-1 text-zinc-500">
                        {i > 0 && <span className="select-none text-xs text-zinc-700">›</span>}

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
            // Известный сегмент — используем красивый label и корректный to
            items.push(isLast ? { label: mapped.label } : { label: mapped.label, to: mapped.to })
        } else {
            // Числовой ID или неизвестный сегмент — пропускаем в авто-режиме
            // (для страниц с :id лучше передавать items вручную)
            if (!isLast) {
                const path = '/' + segments.slice(0, i + 1).join('/')
                items.push({ label: seg, to: path })
            }
            // Последний сегмент (id) не добавляем — он будет заменён названием фильма/кинотеатра
        }
    })

    return items
}