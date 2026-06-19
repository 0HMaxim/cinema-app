// src/components/BurgerMenu.tsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import {
    X, Menu, Home, Film,
    Clapperboard, Tag, Info, Settings,
} from 'lucide-react'

interface NavItem {
    label: string
    to: string
    icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Головна',    to: '/',           icon: <Home size={18} /> },
    { label: 'Фільми',     to: '/movies',     icon: <Film size={18} /> },
    { label: 'Кінотеатри', to: '/cinemas',    icon: <Clapperboard size={18} /> },
    { label: 'Акції',      to: '/promotions', icon: <Tag size={18} /> },
    { label: 'Про нас',    to: '/about',      icon: <Info size={18} /> },
    { label: 'Адмін',      to: '/admin',      icon: <Settings size={18} /> },
]

interface BurgerMenuProps {
    open: boolean
    onToggle: () => void
}

export default function BurgerMenu({ open, onToggle }: BurgerMenuProps) {
    const location = useLocation()

    // Close on route change
    useEffect(() => {
        if (open) onToggle()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname])

    // Close on Escape
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) onToggle()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onToggle])

    // Lock body scroll when open
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => { document.body.style.overflow = '' }
    }, [open])

    return (
        <>
            {/* ── Burger button (остаётся в navbar) ─────────────────────────── */}
            <button
                onClick={onToggle}
                aria-label={open ? 'Закрити меню' : 'Відкрити меню'}
                aria-expanded={open}
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center
                           border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
            >
                {open
                    ? <X    size={18} className="text-white" />
                    : <Menu size={18} className="text-white" />
                }
            </button>

            {/* ── Backdrop + Drawer через портал (вне navbar) ───────────────── */}
            {createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        onClick={onToggle}
                        aria-hidden="true"
                        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm
                                    transition-opacity duration-300
                                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                    />

                    {/* Drawer */}
                    <aside
                        aria-label="Навігаційне меню"
                        className={`fixed top-0 left-0 z-[70] h-screen w-72
                                    bg-zinc-950 border-r border-white/[0.07]
                                    flex flex-col
                                    transition-transform duration-300 ease-in-out
                                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
                    >
                        {/* Header */}
                        <div className="h-16 flex items-center justify-between px-4
                                        border-b border-white/[0.07] shrink-0">
                            <span className="flex items-center gap-2 text-red-500 font-black
                                             tracking-widest uppercase text-[15px]">
                                <Clapperboard size={20} strokeWidth={2.5} />
                                CineMax
                            </span>
                            <button
                                onClick={onToggle}
                                aria-label="Закрити меню"
                                className="w-8 h-8 rounded-lg flex items-center justify-center
                                           text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Nav links */}
                        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                            {NAV_ITEMS.map(({ label, to, icon }) => {
                                const isActive = location.pathname === to
                                    || (to !== '/' && location.pathname.startsWith(to))

                                return (
                                    <Link
                                        key={to}
                                        to={to}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl
                                                    text-[14px] font-medium transition-all duration-150 group
                                                    ${isActive
                                            ? 'bg-red-600/15 text-red-400 border border-red-500/20'
                                            : 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                    >
                                        <span className={`shrink-0 transition-colors
                                                          ${isActive ? 'text-red-400' : 'text-zinc-500 group-hover:text-white'}`}>
                                            {icon}
                                        </span>

                                        {label}

                                        {isActive && (
                                            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                                        )}
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* Footer */}
                        <div className="px-4 py-4 border-t border-white/[0.07] shrink-0">
                            <p className="text-[11px] text-zinc-600 text-center">
                                © {new Date().getFullYear()} CineMax
                            </p>
                        </div>
                    </aside>
                </>,
                document.body
            )}
        </>
    )
}