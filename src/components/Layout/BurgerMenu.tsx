// src/components/BurgerMenu.tsx
import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext.tsx'
import {
    X, Menu, Home, Film,
    Clapperboard, Tag, Info, Settings,
} from 'lucide-react'

interface NavItem {
    labelKey: string
    to: string
    icon: React.ReactNode
}

const NAV_ITEMS: NavItem[] = [
    { labelKey: 'navHome',       to: '/',           icon: <Home size={18} /> },
    { labelKey: 'navMovies',     to: '/movies',     icon: <Film size={18} /> },
    { labelKey: 'navCinemas',    to: '/cinemas',    icon: <Clapperboard size={18} /> },
    { labelKey: 'navPromotions', to: '/promotions', icon: <Tag size={18} /> },
    { labelKey: 'navAbout',      to: '/about',      icon: <Info size={18} /> },
    { labelKey: 'navAdmin',      to: '/admin',      icon: <Settings size={18} /> },
]

interface BurgerMenuProps {
    open: boolean
    onToggle: () => void
}

export default function BurgerMenu({ open, onToggle }: BurgerMenuProps) {
    const location = useLocation()
    const { t } = useApp()

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
                aria-label={open ? t('menuClose') : t('menuOpen')}
                aria-expanded={open}
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border transition-colors"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--fg)' }}
            >
                {open
                    ? <X    size={18} />
                    : <Menu size={18} />
                }
            </button>

            {/* ── Backdrop + Drawer через портал (вне navbar) ───────────────── */}
            {createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        onClick={onToggle}
                        aria-hidden="true"
                        className={`fixed inset-0 z-[60] backdrop-blur-sm transition-opacity duration-300
                                    ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                        style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                    />

                    {/* Drawer */}
                    <aside
                        aria-label={t('menuNav')}
                        className={`fixed top-0 left-0 z-[70] h-screen w-[18rem] border-r flex flex-col
                                    transition-transform duration-300 ease-in-out
                                    ${open ? 'translate-x-0' : '-translate-x-full'}`}
                        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
                    >
                        {/* Header */}
                        <div
                            className="h-16 flex items-center justify-between px-4 border-b shrink-0"
                            style={{ borderColor: 'var(--border)' }}
                        >
                            <span
                                className="flex items-center gap-2 font-black tracking-widest uppercase text-[0.9375rem]"
                                style={{ color: 'var(--accent)' }}
                            >
                                <Clapperboard size={20} strokeWidth={2.5} />
                                CineMax
                            </span>
                            <button
                                onClick={onToggle}
                                aria-label={t('menuClose')}
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                style={{ color: 'var(--fg-muted)' }}
                                onMouseEnter={e => { e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.backgroundColor = 'var(--surface-2)' }}
                                onMouseLeave={e => { e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Nav links */}
                        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                            {NAV_ITEMS.map(({ labelKey, to, icon }) => {
                                const isActive = location.pathname === to
                                    || (to !== '/' && location.pathname.startsWith(to))

                                return (
                                    <Link
                                        key={to}
                                        to={to}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[0.875rem] font-medium transition-all duration-150 group border"
                                        style={isActive
                                            ? {
                                                backgroundColor: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                                                color: 'var(--accent)',
                                                borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
                                            }
                                            : {
                                                color: 'var(--fg-muted)',
                                                borderColor: 'transparent',
                                            }
                                        }
                                        onMouseEnter={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = 'var(--fg)'
                                                e.currentTarget.style.backgroundColor = 'var(--surface-2)'
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isActive) {
                                                e.currentTarget.style.color = 'var(--fg-muted)'
                                                e.currentTarget.style.backgroundColor = 'transparent'
                                            }
                                        }}
                                    >
                                        <span
                                            className="shrink-0 transition-colors"
                                            style={{ color: isActive ? 'var(--accent)' : 'var(--fg-subtle)' }}
                                        >
                                            {icon}
                                        </span>

                                        {t(labelKey)}

                                        {isActive && (
                                            <span
                                                className="ml-auto w-[0.375rem] h-[0.375rem] rounded-full shrink-0"
                                                style={{ backgroundColor: 'var(--accent)' }}
                                            />
                                        )}
                                    </Link>
                                )
                            })}
                        </nav>

                        {/* Footer */}
                        <div className="px-4 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
                            <p className="text-[0.6875rem] text-center" style={{ color: 'var(--fg-subtle)' }}>
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