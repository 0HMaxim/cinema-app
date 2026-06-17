import { NavLink } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const NAV_ITEMS = [
    { to: '/',           label: { uk: 'Головна',    en: 'Home',    ru: 'Главная'    }, icon: '🏠' },
    { to: '/movies',      label: { uk: 'Фільми',     en: 'Movies',  ru: 'Фильмы'     }, icon: '🎬' },
    { to: '/promotions', label: { uk: 'Акції',      en: 'Deals',   ru: 'Акции'      }, icon: '🎟️' },
    { to: '/cinemas',    label: { uk: 'Кінотеатри', en: 'Cinemas', ru: 'Кинотеатры' }, icon: '📍' },
    { to: '/about',      label: { uk: 'Про нас',    en: 'About',   ru: 'О нас'      }, icon: 'ℹ️' },
]

interface SidebarProps {
    open: boolean
    onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
    const { lang } = useApp()

    return (
        <>
            {/* Backdrop */}
            {open && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 40,
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <aside style={{
                position: 'fixed', top: 64, left: 0, zIndex: 50,
                height: 'calc(100vh - 64px)', width: 240,
                display: 'flex', flexDirection: 'column',
                background: 'var(--surface)',
                borderRight: '1px solid var(--border)',
                transform: open ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            }}>

                <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
                    {NAV_ITEMS.map(({ to, label, icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            onClick={onClose}
                            style={({ isActive }) => ({
                                display: 'flex', alignItems: 'center', gap: 12,
                                padding: '10px 20px',
                                fontSize: 14, fontWeight: 500, letterSpacing: '0.02em',
                                textDecoration: 'none',
                                color: isActive ? 'var(--fg)' : 'var(--fg-muted)',
                                background: isActive ? 'var(--surface-2)' : 'transparent',
                                borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
                                transition: 'all 0.15s',
                            })}
                            onMouseEnter={e => {
                                const el = e.currentTarget as HTMLElement
                                if (!el.getAttribute('aria-current'))
                                    el.style.background = 'var(--surface-2)'
                            }}
                            onMouseLeave={e => {
                                const el = e.currentTarget as HTMLElement
                                if (!el.getAttribute('aria-current'))
                                    el.style.background = 'transparent'
                            }}
                        >
                            <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
                            <span>{label[lang as keyof typeof label]}</span>
                        </NavLink>
                    ))}
                </nav>

                <div style={{
                    padding: '12px 20px',
                    borderTop: '1px solid var(--border)',
                    fontSize: 11, color: 'var(--fg-subtle)',
                }}>
                    © 2025 CineMax
                </div>
            </aside>
        </>
    )
}