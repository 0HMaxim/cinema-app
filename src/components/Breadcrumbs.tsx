import { Link, useLocation } from 'react-router-dom'

// ─────────────────────────────────────────────────────────────────
// Варіант 1: Ручне задання items (рекомендується)
//
// Використання:
//   <Breadcrumbs items={[
//     { label: 'Головна', to: '/' },
//     { label: 'Фільми',  to: '/movie' },
//     { label: movie.title },            // ← останній без "to" = поточна сторінка
//   ]} />
//
// Варіант 2: Авто-генерація з URL (якщо items не передано)
//   <Breadcrumbs />
//   → Головна › movie › 123
// ─────────────────────────────────────────────────────────────────

interface BreadcrumbItem {
    label: string
    to?: string
}

interface BreadcrumbsProps {
    items?: BreadcrumbItem[]
    className?: string
}

// Мапа авто-підписів для сегментів URL (для Варіанту 2)
const SEGMENT_LABELS: Record<string, string> = {
    movie: 'Фільми',
    promotions: 'Акції',
    cinemas: 'Кінотеатри',
    about: 'Про нас',
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
    const location = useLocation()

    // Якщо items не передано — будуємо авто з URL
    const resolvedItems: BreadcrumbItem[] = items ?? buildAutoItems(location.pathname)

    if (resolvedItems.length <= 1) return null // не показуємо на головній

    return (
        <nav
            aria-label="breadcrumb"
            className={`flex items-center gap-1 flex-wrap text-sm py-3 px-6 border-b  ${className}`}
        >
            {resolvedItems.map((item, i) => {
                const isLast = i === resolvedItems.length - 1

                return (
                    <span key={i} className="flex items-center gap-1">
                        {/* Роздільник */}
                        {i > 0 && (
                            <span className="select-none text-xs">›</span>
                        )}

                        {isLast ? (
                            // Поточна сторінка — не посилання
                            <span className="font-semibold tracking-wide">
                                {item.label}
                            </span>
                        ) : (
                            // Попередні — посилання
                            <Link
                                to={item.to ?? '/'}
                                className="transition-colors duration-150 tracking-wide"
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

// ─── Авто-побудова з pathname ──────────────────────────────────
function buildAutoItems(pathname: string): BreadcrumbItem[] {
    const segments = pathname.split('/').filter(Boolean)

    const items: BreadcrumbItem[] = [{ label: 'Головна', to: '/' }]

    segments.forEach((seg, i) => {
        const path = '/' + segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        const label = SEGMENT_LABELS[seg] ?? seg

        items.push(isLast ? { label } : { label, to: path })
    })

    return items
}