import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import ThemeSwitcher from './ThemeSwitcher'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

interface SearchResult {
    id: number
    title: string
    poster_path: string | null
    release_date: string
    vote_average: number
}
interface NavbarProps {
    sidebarOpen: boolean
    onToggleSidebar: () => void
}

export default function Navbar({ sidebarOpen, onToggleSidebar }: NavbarProps) {
    const { lang, setLang, t } = useApp()
    const [query, setQuery]       = useState('')
    const [results, setResults]   = useState<SearchResult[]>([])
    const [searching, setSearching] = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (!query.trim()) { setResults([]); setDropdownOpen(false); return }

        timerRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res  = await fetch(
                    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=${LANG_TMDB[lang]}&page=1`,
                    { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
                )
                const data = await res.json()
                setResults(data.results?.slice(0, 6) ?? [])
                setDropdownOpen(true)
            } catch { setResults([]) }
            finally  { setSearching(false) }
        }, 400)
    }, [query, lang])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node))
                setDropdownOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <nav style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, height: 64,
            display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px',
            background: 'var(--navbar-bg)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border)',
        }}>

            {/* Бургер */}
            <button
                onClick={onToggleSidebar}
                aria-label="Меню"
                style={{
                    flexShrink: 0, width: 40, height: 40, borderRadius: 12,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', gap: 5,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-2)',
                    cursor: 'pointer',
                }}
            >
                {[
                    sidebarOpen ? 'translateY(7px) rotate(45deg)'  : '',
                    sidebarOpen ? 'scaleX(0) opacity(0)' : '',
                    sidebarOpen ? 'translateY(-7px) rotate(-45deg)' : '',
                ].map((transform, i) => (
                    <span key={i} style={{
                        display: 'block', width: 20, height: 1.5,
                        background: 'var(--fg)', borderRadius: 1,
                        transition: 'all 0.3s',
                        transform,
                        opacity: i === 1 && sidebarOpen ? 0 : 1,
                    }} />
                ))}
            </button>

            {/* Логотип */}
            <Link to="/" style={{
                flexShrink: 0, fontSize: 17, fontWeight: 700,
                letterSpacing: '0.12em', color: 'var(--accent)',
                textDecoration: 'none', textTransform: 'uppercase',
            }}>
                CineMax
            </Link>

            {/* Поиск */}
            <div ref={searchRef} style={{ flex: 1, position: 'relative', maxWidth: 440, margin: '0 auto' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    height: 40, padding: '0 12px', borderRadius: 12,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-2)',
                    transition: 'border-color 0.15s',
                }}>
                    <span style={{ color: 'var(--fg-subtle)', fontSize: 15 }}>🔍</span>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder={t('search')}
                        style={{
                            flex: 1, background: 'none', border: 'none', outline: 'none',
                            fontSize: 14, color: 'var(--fg)',
                        }}
                    />
                    {searching && (
                        <span style={{ fontSize: 11, color: 'var(--fg-subtle)' }}>...</span>
                    )}
                    {query && (
                        <button onClick={() => { setQuery(''); setResults([]); setDropdownOpen(false) }}
                                style={{ color: 'var(--fg-subtle)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14 }}>
                            ✕
                        </button>
                    )}
                </div>

                {/* Дропдаун */}


                {dropdownOpen && results.length > 0 && (
                    <div style={{
                        position: 'absolute', top: 48, left: 0, right: 0, zIndex: 50,
                        background: 'var(--surface)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 14, overflow: 'hidden',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    }}>
                        {results.map(m => (
                            <Link key={m.id} to={`/movie/${m.id}`}
                                  onClick={() => { setQuery(''); setDropdownOpen(false) }}
                                  style={{
                                      display: 'flex', alignItems: 'center', gap: 12,
                                      padding: '8px 12px', textDecoration: 'none',
                                      borderBottom: '1px solid var(--border)',
                                      transition: 'background 0.1s',
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                            >
                                {m.poster_path ? (
                                    <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title}
                                         style={{ width: 36, height: 48, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: 36, height: 48, borderRadius: 6, background: 'var(--surface-3)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', flexShrink: 0 }}>🎬</div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--fg)',
                                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {m.title}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--fg-subtle)', display: 'flex', gap: 8, marginTop: 2 }}>
                                        <span>{m.release_date?.slice(0, 4) ?? '—'}</span>
                                        {m.vote_average > 0 && (
                                            <span style={{ color: 'var(--accent)' }}>⭐ {m.vote_average.toFixed(1)}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}


                {dropdownOpen && query && results.length === 0 && !searching && (
                    <div style={{
                        position: 'absolute', top: 48, left: 0, right: 0, zIndex: 50,
                        background: 'var(--surface)', border: '1px solid var(--border-strong)',
                        borderRadius: 14, padding: '12px 16px',
                        fontSize: 14, color: 'var(--fg-muted)',
                    }}>
                        Нічого не знайдено
                    </div>
                )}
            </div>

            {/* Правая часть */}
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>

                <Link
                    to="/admin/cinemas"
                    style={{
                        height: 36, padding: '0 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border-strong)',
                        background: 'var(--surface-2)',
                        color: 'var(--fg-muted)',
                        fontSize: 13, fontWeight: 500,
                        display: 'flex', alignItems: 'center', gap: 6,
                        textDecoration: 'none',
                        transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
                >
                    ⚙️ Адмін
                </Link>

                {/* Язык */}
                <div style={{
                    display: 'flex', borderRadius: 10, overflow: 'hidden',
                    border: '1px solid var(--border-strong)',
                }}>
                    {(['uk', 'en', 'ru'] as const).map(l => (
                        <button key={l} onClick={() => setLang(l)} style={{
                            padding: '6px 10px', fontSize: 12, fontWeight: 500,
                            letterSpacing: '0.05em', textTransform: 'uppercase',
                            background: lang === l ? 'var(--accent)' : 'transparent',
                            color: lang === l ? 'var(--accent-fg)' : 'var(--fg-muted)',
                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                            {l}
                        </button>
                    ))}
                </div>

                {/* Тема + градиент */}
                <ThemeSwitcher />

                {/* Войти */}
                <button style={{
                    height: 36, padding: '0 16px', borderRadius: 10,
                    background: 'var(--accent)', color: 'var(--accent-fg)',
                    fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                    transition: 'background 0.15s',
                }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent)')}
                >
                    {t('login')}
                </button>
            </div>
        </nav>
    )
}