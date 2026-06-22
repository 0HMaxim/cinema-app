// src/layouts/CartPageLayout.tsx
import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { CartSessionInfo } from '../models/cart'
import CartSidebar from "../components/cart/CartSidebar.tsx";

interface SidebarSummary {
    content:      ReactNode
    total:        number
    ctaLabel:     string
    onCta:        () => void
    ctaDisabled?: boolean
    note?:        string
}

interface Props {
    session:    CartSessionInfo
    sidebar:    SidebarSummary
    children:   ReactNode
    mobileBar?: ReactNode
}

const CART_CRUMBS: Record<string, string> = {
    seatplan:   'Місця',
    concession: 'Перекуски',
    checkout:   'Оплата',
}

function CartBreadcrumbs({ session }: { session: CartSessionInfo }) {
    const { pathname } = useLocation()
    const lastSeg = pathname.split('/').at(-1) ?? ''

    const items = [
        { label: 'Головна',          to: '/' },
        { label: session.movieTitle, to: session.backHref },
        { label: CART_CRUMBS[lastSeg] ?? lastSeg },
    ]

    return (
        <nav className="hidden sm:flex items-center gap-1 text-xs">
            {items.map((item, i) => {
                const isLast = i === items.length - 1
                return (
                    <span
                        key={i}
                        className="flex items-center gap-1"
                        style={{ color: 'var(--fg-muted)' }}
                    >
                        {i > 0 && (
                            <span
                                className="select-none"
                                style={{ color: 'var(--border-strong)' }}
                            >
                                ›
                            </span>
                        )}
                        {isLast ? (
                            <span className="font-semibold" style={{ color: 'var(--fg)' }}>
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                to={item.to ?? '/'}
                                className="transition-colors hover:opacity-100"
                                style={{ color: 'var(--fg-muted)' }}
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

export default function CartPageLayout({ session, sidebar, children, mobileBar }: Props) {
    return (
        <div
            className="min-h-screen pb-24 select-none"
        >
            {/* Sub-header */}
            <div
                className="backdrop-blur-sm sticky top-16 z-20 border-b"
                style={{
                    backgroundColor: 'color-mix(in srgb, var(--surface) 60%, transparent)',
                    borderColor: 'var(--border)',
                }}
            >
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">

                    <Link
                        to={session.backHref}
                        className="text-sm shrink-0 transition-colors"
                        style={{ color: 'var(--fg-muted)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
                    >
                        ←
                    </Link>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>
                            {session.movieTitle}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                            {session.cinemaName} · {session.hallName} · {session.date} · {session.time}
                            {session.endTime && (
                                <span style={{ color: 'var(--fg-subtle)' }}> – {session.endTime}</span>
                            )}
                            {' · '}
                            <span style={{ color: 'var(--fg-muted)' }}>{session.format}</span>
                        </p>
                    </div>

                    <CartBreadcrumbs session={session} />
                </div>
            </div>

            {/* Body */}
            <div className="max-w-5xl mx-auto px-4 pt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
                <div>{children}</div>
                <CartSidebar session={session} sidebar={sidebar} />
            </div>

            {mobileBar}
        </div>
    )
}