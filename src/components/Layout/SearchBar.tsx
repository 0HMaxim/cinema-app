import { useRef, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, X, LoaderCircle, Film, ChevronDown } from 'lucide-react'
import { useApp } from '../../context/AppContext.tsx'

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

interface SearchResult {
    id: number; title: string
    poster_path: string | null
    release_date: string; vote_average: number
}

export default function SearchBar() {
    const { lang, t } = useApp()
    const [query, setQuery]             = useState('')
    const [results, setResults]         = useState<SearchResult[]>([])
    const [searching, setSearching]     = useState(false)
    const [dropdownOpen, setDropdown]   = useState(false)
    const [focused, setFocused]         = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current)
        if (!query.trim()) { setResults([]); setDropdown(false); return }
        timerRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const res  = await fetch(
                    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=${LANG_TMDB[lang]}&page=1`,
                    { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
                )
                const data = await res.json()
                setResults(data.results?.slice(0, 6) ?? [])
                setDropdown(true)
            } catch { setResults([]) }
            finally { setSearching(false) }
        }, 400)
    }, [query, lang])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node))
                setDropdown(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={searchRef} className="relative w-full">
            <div
                className="flex items-center gap-2 h-10 px-3 rounded-xl border transition-all duration-200"
                style={{
                    borderColor: focused ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: focused ? 'var(--surface)' : 'var(--surface-2)',
                    boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent)' : 'none',
                }}
            >
                {searching
                    ? <LoaderCircle size={15} className="animate-spin shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                    : <Search size={15} className="shrink-0" style={{ color: 'var(--fg-subtle)' }} />
                }
                <input
                    type="text" value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={t('search')}
                    className="flex-1 bg-transparent border-none outline-none text-[0.8125rem] min-w-0"
                    style={{ color: 'var(--fg)' }}
                />
                {query && (
                    <button onClick={() => { setQuery(''); setResults([]); setDropdown(false) }}
                            style={{ color: 'var(--fg-subtle)', flexShrink: 0 }}>
                        <X size={14} />
                    </button>
                )}
            </div>

            {dropdownOpen && results.length > 0 && (
                <div className="absolute top-12 inset-x-0 z-[999] rounded-2xl overflow-hidden border"
                     style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', boxShadow: '0 16px 48px rgba(0,0,0,0.35)' }}>
                    {results.map((m, i) => (
                        <Link key={m.id} to={`/movie/${m.id}`}
                              onClick={() => { setQuery(''); setDropdown(false) }}
                              className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-[color:var(--surface-2)]"
                              style={{ borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            {m.poster_path
                                ? <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} alt={m.title} className="w-9 h-12 object-cover rounded-lg shrink-0" />
                                : <div className="w-9 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--surface-2)', color: 'var(--fg-subtle)' }}><Film size={16} /></div>
                            }
                            <div className="flex-1 min-w-0">
                                <p className="text-[0.8125rem] font-medium truncate" style={{ color: 'var(--fg)' }}>{m.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[0.6875rem]" style={{ color: 'var(--fg-muted)' }}>{m.release_date?.slice(0, 4) ?? '—'}</span>
                                    {m.vote_average > 0 && <span className="text-[0.6875rem] font-medium" style={{ color: 'var(--accent)' }}>★ {m.vote_average.toFixed(1)}</span>}
                                </div>
                            </div>
                            <ChevronDown size={14} className="shrink-0 -rotate-90" style={{ color: 'var(--fg-subtle)' }} />
                        </Link>
                    ))}
                </div>
            )}

            {dropdownOpen && query && results.length === 0 && !searching && (
                <div className="absolute top-12 inset-x-0 z-[999] rounded-2xl border px-4 py-4 text-center"
                     style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
                    <Film size={24} className="mx-auto mb-2" style={{ color: 'var(--fg-subtle)' }} />
                    <p className="text-[0.8125rem]" style={{ color: 'var(--fg-muted)' }}>{t('searchNotFound')}</p>
                </div>
            )}
        </div>
    )
}