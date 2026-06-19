// src/layouts/CartPageLayout.tsx
import { Link, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { CartSessionInfo } from '..//models/cart'
import CartSidebar from "../components/cart/CartSidebar.tsx";

// и убираешь локальный interface CartSessionInfo
// ─── Types ─


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

// ─── Cart breadcrumbs ─────────────────────────────────────────────────────────

const CART_CRUMBS: Record<string, string> = {
    seatplan:   'Місця',
    concession: 'Перекуски',
    checkout:   'Оплата',
}

function CartBreadcrumbs({ session }: { session: CartSessionInfo }) {
    const { pathname } = useLocation()
    const lastSeg = pathname.split('/').at(-1) ?? ''

    const items = [
        { label: 'Головна',           to: '/' },
        { label: session.movieTitle,  to: session.backHref },
        { label: CART_CRUMBS[lastSeg] ?? lastSeg },
    ]

    return (
        <nav className="hidden sm:flex items-center gap-1 text-xs">
            {items.map((item, i) => {
                const isLast = i === items.length - 1
                return (
                    <span key={i} className="flex items-center gap-1 text-zinc-500">
                        {i > 0 && (
                            <span className="select-none text-zinc-700">›</span>
                        )}
                        {isLast ? (
                            <span className="text-white font-semibold">
                                {item.label}
                            </span>
                        ) : (
                            <Link
                                to={item.to ?? '/'}
                                className="hover:text-white transition-colors"
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

// ─── Layout
export default function CartPageLayout({ session, sidebar, children, mobileBar }: Props) {
    return (
        <div className="min-h-screen text-white pb-24 select-none">

            {/* Sub-header — прилипає під глобальним Navbar (h-16) */}
            <div className="border-b border-white/8 bg-black/30 backdrop-blur-sm sticky top-16 z-20">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">

                    <Link
                        to={session.backHref}
                        className="text-zinc-500 hover:text-white transition-colors text-sm shrink-0"
                    >
                        ←
                    </Link>

                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{session.movieTitle}</p>
                        <p className="text-xs text-zinc-500 truncate">
                            {session.cinemaName} · {session.hallName} · {session.date} · {session.time}
                            {session.endTime && (
                                <span className="text-zinc-600"> – {session.endTime}</span>
                            )}
                            {' · '}
                            <span className="text-zinc-400">{session.format}</span>
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