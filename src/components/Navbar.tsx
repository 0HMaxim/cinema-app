import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../firebase'
import { useApp } from '../context/AppContext'
import ThemeSwitcher from './ThemeSwitcher'
import SeedDataButton from './SeedDataButton'
import {
    X, Search, MapPin, ChevronRight,
    Film, Settings, LogIn, Clapperboard,
    Loader2,
} from 'lucide-react'
import CinemaPickerPanel from "./CinemaPickerPanel.tsx";
import BurgerMenu from "./BurgerMenu.tsx";

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

interface SearchResult {
    id: number
    title: string
    poster_path: string | null
    release_date: string
    vote_average: number
}

interface CinemaItem {
    id: string
    name: string
    city: string
    address: string
}

export default function Navbar() {
    const { lang, setLang, t, selectedCinemaId, setSelectedCinemaId } = useApp()

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
    const [cinemas, setCinemas]               = useState<CinemaItem[]>([])
    const [cinemasLoading, setCinemasLoading] = useState(false)
    const [selectedCity, setSelectedCity]     = useState<string | null>(null)

    const [menuOpen, setMenuOpen] = useState(false)

    // Load cinemas when panel opens
    useEffect(() => {
        if (!cinemaPanel || cinemas.length > 0) return
        setCinemasLoading(true)
        getDocs(collection(db, 'cinemas'))
            .then(snap => {
                const list: CinemaItem[] = snap.docs.map(d => {
                    const data = d.data()
                    return { id: d.id, name: data.name ?? '', city: data.city ?? '', address: data.address ?? '' }
                })
                setCinemas(list)
                if (selectedCinemaId) {
                    const found = list.find(c => c.id === selectedCinemaId)
                    if (found) setSelectedCity(found.city)
                } else if (list.length > 0) {
                    setSelectedCity(list[0].city)
                }
            })
            .finally(() => setCinemasLoading(false))
    }, [cinemaPanel]) // eslint-disable-line react-hooks/exhaustive-deps

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
            <nav className="fixed top-0 inset-x-0 z-50 h-16 flex items-center gap-3 px-4
                            bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.07]">

                {/* Burger */}
                <BurgerMenu open={menuOpen} onToggle={() => setMenuOpen(p => !p)} />

                {/* Logo */}
                <Link
                    to="/"
                    className="shrink-0 flex items-center gap-2 text-red-500 font-black
                               tracking-widest uppercase text-[15px] hover:text-red-400 transition-colors"
                >
                    <Clapperboard size={20} strokeWidth={2.5} />
                    CineMax
                </Link>

                {/* Divider */}
                <div className="w-px h-6 bg-white/10 shrink-0" />

                {/* Cinema picker button */}
                <button
                    onClick={() => setCinemaPanel(true)}
                    className={`shrink-0 h-9 px-3 rounded-xl flex items-center gap-2 text-[13px] font-medium
                                border transition-all duration-200 max-w-[200px]
                                ${selectedCinema
                        ? 'border-red-500/50 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                        : 'border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                    }`}
                >
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">
                        {selectedCinema ? selectedCinema.name : 'Обрати кінотеатр'}
                    </span>
                    <ChevronRight size={13} className="shrink-0 opacity-50" />
                </button>

                {/* ── Search ─────────────────────────────────────────────────────── */}
                <div ref={searchRef} className="flex-1 relative max-w-md mx-auto">
                    <div className={`flex items-center gap-2 h-10 px-3 rounded-xl border transition-all duration-200
                                    ${searchFocused
                        ? 'border-red-500/50 bg-zinc-900 shadow-[0_0_0_3px_rgb(239,68,68,0.1)]'
                        : 'border-white/10 bg-white/5'
                    }`}>
                        {searching
                            ? <Loader2 size={15} className="text-zinc-500 animate-spin shrink-0" />
                            : <Search size={15} className="text-zinc-500 shrink-0" />
                        }
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onFocus={() => setSearchFocused(true)}
                            onBlur={() => setSearchFocused(false)}
                            placeholder={t('search')}
                            className="flex-1 bg-transparent border-none outline-none text-[13px]
                                       text-white placeholder-zinc-600"
                        />
                        {query && (
                            <button
                                onClick={() => { setQuery(''); setResults([]); setDropdownOpen(false) }}
                                className="text-zinc-500 hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Search dropdown */}
                    {dropdownOpen && results.length > 0 && (
                        <div className="absolute top-12 inset-x-0 z-50 rounded-2xl overflow-hidden
                                        border border-white/10 bg-zinc-900
                                        shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                            {results.map((m, i) => (
                                <Link
                                    key={m.id}
                                    to={`/movie/${m.id}`}
                                    onClick={() => { setQuery(''); setDropdownOpen(false) }}
                                    className={`flex items-center gap-3 px-3 py-2.5 hover:bg-white/5
                                                transition-colors text-left
                                                ${i < results.length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                                >
                                    {m.poster_path ? (
                                        <img
                                            src={`https://image.tmdb.org/t/p/w92${m.poster_path}`}
                                            alt={m.title}
                                            className="w-9 h-12 object-cover rounded-lg shrink-0"
                                        />
                                    ) : (
                                        <div className="w-9 h-12 rounded-lg bg-white/5 flex items-center
                                                        justify-center text-zinc-600 shrink-0">
                                            <Film size={16} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium text-white truncate">{m.title}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[11px] text-zinc-500">
                                                {m.release_date?.slice(0, 4) ?? '—'}
                                            </span>
                                            {m.vote_average > 0 && (
                                                <span className="text-[11px] text-amber-400 font-medium">
                                                    ★ {m.vote_average.toFixed(1)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className="text-zinc-600 shrink-0" />
                                </Link>
                            ))}
                        </div>
                    )}

                    {dropdownOpen && query && results.length === 0 && !searching && (
                        <div className="absolute top-12 inset-x-0 z-50 rounded-2xl border border-white/10
                                        bg-zinc-900 px-4 py-4 text-center">
                            <Film size={24} className="mx-auto text-zinc-700 mb-2" />
                            <p className="text-[13px] text-zinc-500">Нічого не знайдено</p>
                        </div>
                    )}
                </div>

                {/* ── Right controls ──────────────────────────────────────────────── */}
                <div className="shrink-0 flex items-center gap-2">

                    {/* Admin */}
                    <Link
                        to="/admin/cinemas"
                        className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-zinc-400
                                   hover:bg-white/10 hover:text-white transition-all text-[13px] font-medium
                                   flex items-center gap-1.5"
                    >
                        <Settings size={14} />
                        <span className="hidden sm:inline">Адмін</span>
                    </Link>

                    {/* Seed */}
                    <SeedDataButton />

                    {/* Lang switcher */}
                    <div className="flex rounded-xl overflow-hidden border border-white/10">
                        {(['uk', 'en', 'ru'] as const).map(l => (
                            <button
                                key={l}
                                onClick={() => setLang(l)}
                                className={`px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide
                                            transition-all duration-150
                                            ${lang === l
                                    ? 'bg-red-600 text-white'
                                    : 'bg-transparent text-zinc-500 hover:text-zinc-300'
                                }`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>

                    {/* Theme */}
                    <ThemeSwitcher />

                    {/* Login */}
                    <button
                        className="h-9 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white
                                   text-[13px] font-semibold transition-colors flex items-center gap-1.5"
                    >
                        <LogIn size={14} />
                        <span className="hidden sm:inline">{t('login')}</span>
                    </button>
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