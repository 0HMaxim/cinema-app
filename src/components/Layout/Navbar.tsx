import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext.tsx'
import ThemeSwitcher from '../ThemeSwitcher.tsx'
import SeedDataButton from './SeedDataButton.tsx'
import {
    X, Search, MapPin, ChevronDown,
    Film, Settings, LogIn, Clapperboard,
    LoaderCircle,
} from 'lucide-react'
import CinemaPickerPanel from "./CinemaPickerPanel.tsx";
import BurgerMenu from "./BurgerMenu.tsx";

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

interface SearchResult {
    id: number
    title: string
    poster_path: string | null
    release_date: string
    vote_average: number
}

export default function Navbar() {
    const { lang, setLang, t, selectedCinemaId, setSelectedCinemaId,
        cinemas, cinemasLoading } = useApp()

    const isAdmin = false;
    // ── Search ──────────────────────────────────────────────────────────────
    const [query, setQuery]               = useState('')
    const [results, setResults]           = useState<SearchResult[]>([])
    const [searching, setSearching]       = useState(false)
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [searchFocused, setSearchFocused] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Cinema panel ────────────────────────────────────────────────────────
    const [cinemaPanel, setCinemaPanel]       = useState(false)
    const [selectedCity, setSelectedCity]     = useState<string | null>(null)

    const [menuOpen, setMenuOpen] = useState(false)

    // Load cinemas when panel opens





    // TMDB search with debounce
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
            finally   { setSearching(false) }
        }, 400)
    }, [query, lang])

    // Close search dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node))
                setDropdownOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    const selectedCinema  = cinemas.find(c => c.id === selectedCinemaId)

    return (
        <>
            {/* ════════════════════════════════ NAVBAR ════════════════════════════════ */}
            <nav
                className="sticky top-0 inset-x-0 z-50 h-16 backdrop-blur-xl border-b"
                style={{ backgroundColor: 'color-mix(in srgb, var(--surface) 85%, transparent)', borderColor: 'var(--border)' }}
            >
                {/* Внутренний контейнер со скроллом на мобилке */}
                <div className="h-full flex justify-between items-center gap-2 px-3 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                     style={{ minWidth: 0 }}>

                    {/* Burger */}
                    <BurgerMenu open={menuOpen} onToggle={() => setMenuOpen(p => !p)} />

                    {/* Logo */}
                    <Link
                        to="/"
                        className="shrink-0 flex items-center gap-2 font-black tracking-widest uppercase text-[15px] transition-colors"
                        style={{ color: 'var(--accent)' }}
                    >
                        <Clapperboard size={20} strokeWidth={2.5} />
                        CineMax
                    </Link>

                    <div className="w-px h-6 shrink-0" style={{ backgroundColor: 'var(--border-strong)' }} />

                    {/* Cinema picker */}
                    <button
                        onClick={() => setCinemaPanel(true)}
                        className="shrink-0 h-9 px-2 sm:px-3 rounded-xl flex items-center gap-1.5 text-[0.8125rem] font-medium border transition-all duration-200"
                        style={{
                            ...(selectedCinema
                                ? { borderColor: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }
                                : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--fg-muted)' })
                        }}
                    >
                        <MapPin size={14} className="shrink-0" />
                        <span className="hidden sm:block truncate max-w-[7.5rem]">
                            {selectedCinema ? selectedCinema.name : t('chooseCinema')}
                        </span>
                        <ChevronDown size={13} className="shrink-0 opacity-50" />
                    </button>

                    {/* Search — растягивается, но не сжимается меньше 140px */}
                    <div ref={searchRef} className="relative" style={{ flex: '1 1 140px', minWidth: 140, maxWidth: 400 }}>
                        <div
                            className="flex items-center gap-2 h-10 px-3 rounded-xl border transition-all duration-200"
                            style={{
                                borderColor: searchFocused ? 'var(--accent)' : 'var(--border)',
                                backgroundColor: searchFocused ? 'var(--surface)' : 'var(--surface-2)',
                                boxShadow: searchFocused ? '0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)' : 'none',
                            }}
                        >
                            {searching
                                ? <LoaderCircle size={15} className="animate-spin shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                                : <Search size={15} className="shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                            }
                            <input
                                type="text"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                onFocus={() => setSearchFocused(true)}
                                onBlur={() => setSearchFocused(false)}
                                placeholder={t('search')}
                                className="flex-1 bg-transparent border-none outline-none text-[13px] min-w-0"
                                style={{ color: 'var(--fg)' }}
                            />
                            {query && (
                                <button onClick={() => { setQuery(''); setResults([]); setDropdownOpen(false) }}
                                        style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Dropdown — без изменений */}
                        {dropdownOpen && results.length > 0 && (
                            <div className="absolute top-12 inset-x-0 z-50 rounded-2xl overflow-hidden border"
                                 style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', boxShadow: '0 16px 48px rgba(0,0,0,0.35)' }}>
                                {results.map((m, i) => (
                                    <Link key={m.id} to={`/movie/${m.id}`}
                                          onClick={() => { setQuery(''); setDropdownOpen(false) }}
                                          className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[color:var(--surface-2)]"
                                          style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                        {m.poster_path
                                            ? <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title} className="w-9 h-12 object-cover rounded-lg shrink-0" />
                                            : <div className="w-9 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--fg-subtle)' }}><Film size={16} /></div>
                                        }
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium truncate" style={{ color: 'var(--fg)' }}>{m.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>{m.release_date?.slice(0, 4) ?? '—'}</span>
                                                {m.vote_average > 0 && <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>★ {m.vote_average.toFixed(1)}</span>}
                                            </div>
                                        </div>
                                        <ChevronDown size={14} className="shrink-0 -rotate-90" style={{ color: 'var(--fg-subtle)' }} />
                                    </Link>
                                ))}
                            </div>
                        )}

                        {dropdownOpen && query && results.length === 0 && !searching && (
                            <div className="absolute top-12 inset-x-0 z-50 rounded-2xl border px-4 py-4 text-center"
                                 style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                                <Film size={24} className="mx-auto mb-2" style={{ color: 'var(--fg-subtle)' }} />
                                <p className="text-[13px]" style={{ color: 'var(--fg-muted)' }}>{t('searchNotFound')}</p>
                            </div>
                        )}
                    </div>

                    {/* Right controls */}
                    <div className="shrink-0 flex items-center gap-1 sm:gap-1.5">

                        {/* admin — только иконка на xs */}
                        <Link
                            to={isAdmin ? '/' : '/admin/cinemas'}
                            className="h-9 w-9 sm:w-auto sm:px-3 rounded-xl border transition-all text-[0.8125rem] font-medium flex items-center justify-center gap-1.5 shrink-0"
                            style={isAdmin
                                ? { borderColor: 'var(--accent)', backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' }
                                : { borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)', color: 'var(--fg-muted)' }
                            }
                        >
                            <Settings size={14} className="shrink-0" />
                            <span className="hidden sm:inline">{isAdmin ? t('home') : t('admin')}</span>
                        </Link>

                        {/* SeedDataButton — скрыт на xs, виден с sm */}
                        <div className="hidden sm:block">
                            <SeedDataButton />
                        </div>

                        {/* Lang switcher — компактный на xs */}
                        <div className="flex rounded-xl overflow-hidden border shrink-0" style={{ borderColor: 'var(--border)' }}>
                            {(['uk', 'en', 'ru'] as const).map(l => (
                                <button
                                    key={l}
                                    onClick={() => setLang(l)}
                                    className="px-1.5 sm:px-2.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide transition-all duration-150"
                                    style={lang === l
                                        ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }
                                        : { backgroundColor: 'transparent', color: 'var(--fg-muted)' }}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        <ThemeSwitcher />

                        {/* Login — только иконка на xs */}
                        <button
                            className="h-9 w-9 sm:w-auto sm:px-3 rounded-xl text-[0.8125rem] font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                        >
                            <LogIn size={14} className="shrink-0" />
                            <span className="hidden sm:inline">{t('login')}</span>
                        </button>

                    </div>
                </div>
            </nav>


            {/* ════════════════════════════════ CINEMA PANEL ═══════════════════════ */}
            <CinemaPickerPanel
                open={cinemaPanel}
                onClose={() => setCinemaPanel(false)}
                cinemas={cinemas}
                cinemasLoading={cinemasLoading}
                selectedCinemaId={selectedCinemaId}
                setSelectedCinemaId={setSelectedCinemaId}
                selectedCity={selectedCity}
                setSelectedCity={setSelectedCity}
            />

        </>
    )
}