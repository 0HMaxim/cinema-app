import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Breadcrumbs from '../components/Breadcrumbs'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

const TABS_LABELS: Record<string, Record<string, string>> = {
    uk: { now: 'Зараз у кіно', soon: 'Скоро у прокаті', archive: 'Архів' },
    en: { now: 'Now Playing',  soon: 'Coming Soon',      archive: 'Archive' },
    ru: { now: 'Сейчас в кино', soon: 'Скоро в прокате', archive: 'Архив' },
}
const PAGE_TITLE:  Record<string, string> = { uk: 'Фільми',    en: 'Movies',      ru: 'Фильмы'     }
const CLEAR_LABEL: Record<string, string> = { uk: 'Усі фільми',en: 'All movies',  ru: 'Все фильмы' }

interface Movie {
    id: number
    title: string
    poster_path: string | null
    release_date?: string
}

function MovieGrid({ movies, cardWidth = 140, rows = 15, onMovieClick }: {
    movies: Movie[]; cardWidth?: number; rows?: number; onMovieClick: (id: number) => void
}) {
    const gap = 12
    const posterHeight = Math.round(cardWidth * 1.5)
    const rowHeight = posterHeight + 48 + gap
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, ${cardWidth}px)`, gap, maxHeight: rows * rowHeight, overflow: 'hidden' }}>
            {movies.map(movie => (
                <div key={movie.id} onClick={() => onMovieClick(movie.id)} className="group" style={{ width: cardWidth, cursor: 'pointer' }}>
                    <div style={{ width: cardWidth, height: posterHeight, borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'var(--surface-2)' }}>
                        {movie.poster_path
                            ? <img src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`} alt={movie.title} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: 24 }}>🎬</div>
                        }
                    </div>
                    <p className="text-xs leading-tight line-clamp-2 mb-0.5 group-hover:underline" style={{ color: 'var(--fg)' }}>{movie.title}</p>
                    {movie.release_date && <p style={{ fontSize: 10, color: 'var(--fg-subtle)' }}>{movie.release_date.slice(0, 7)}</p>}
                </div>
            ))}
        </div>
    )
}

function GridSkeleton() {
    return (
        <div className="grid gap-3 animate-pulse" style={{ gridTemplateColumns: 'repeat(auto-fill, 140px)' }}>
            {Array.from({ length: 20 }).map((_, i) => (
                <div key={i}>
                    <div style={{ width: 140, height: 210, borderRadius: 10, marginBottom: 8, background: 'var(--surface-2)' }} />
                    <div style={{ height: 12, borderRadius: 4, width: '80%', marginBottom: 6, background: 'var(--surface-2)' }} />
                    <div style={{ height: 10, borderRadius: 4, width: '40%', background: 'var(--surface-2)' }} />
                </div>
            ))}
        </div>
    )
}

type TabKey = 'now' | 'soon' | 'archive'

async function loadMovies(tab: TabKey, genreId: string, tmdbLang: string): Promise<Movie[]> {
    const h = { Authorization: `Bearer ${TMDB_TOKEN}` }
    const today   = new Date().toISOString().slice(0, 10)
    const past180 = new Date(Date.now() - 180 * 86400_000).toISOString().slice(0, 10)
    const fut90   = new Date(Date.now() +  90 * 86400_000).toISOString().slice(0, 10)

    if (genreId) {
        // Discover с фильтром по жанру + диапазон дат под вкладку
        const dateFilter =
            tab === 'now'  ? `&primary_release_date.gte=${past180}&primary_release_date.lte=${today}` :
                tab === 'soon' ? `&primary_release_date.gte=${today}&primary_release_date.lte=${fut90}` :
                    `&primary_release_date.lte=2022-12-31`
        const pages = await Promise.all([1, 2, 3].map(p =>
            fetch(`https://api.themoviedb.org/3/discover/movie?language=${tmdbLang}&with_genres=${genreId}&sort_by=popularity.desc${dateFilter}&page=${p}`, { headers: h }).then(r => r.json())
        ))
        return pages.flatMap(p => p.results ?? [])
    }

    // Без жанра — стандартные эндпоинты
    if (tab === 'now') {
        const pages = await Promise.all([1, 2, 3].map(p =>
            fetch(`https://api.themoviedb.org/3/movie/now_playing?language=${tmdbLang}&region=UA&page=${p}`, { headers: h }).then(r => r.json())
        ))
        return pages.flatMap(p => p.results ?? [])
    }
    if (tab === 'soon') {
        const pages = await Promise.all([1, 2, 3].map(p =>
            fetch(`https://api.themoviedb.org/3/movie/upcoming?language=${tmdbLang}&region=UA&page=${p}`, { headers: h }).then(r => r.json())
        ))
        return pages.flatMap(p => p.results ?? [])
    }
    const pages = await Promise.all([1, 2, 3].map(p =>
        fetch(`https://api.themoviedb.org/3/discover/movie?language=${tmdbLang}&sort_by=vote_count.desc&primary_release_date.lte=2022-12-31&page=${p}`, { headers: h }).then(r => r.json())
    ))
    return pages.flatMap(p => p.results ?? [])
}

export default function Movies() {
    const { lang } = useApp()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const genreId   = searchParams.get('genre') ?? ''
    const genreName = searchParams.get('genreName') ?? ''
    const tmdbLang  = LANG_TMDB[lang]

    const [activeTab, setActiveTab] = useState<TabKey>('now')
    const [movies, setMovies]       = useState<Movie[]>([])
    const [loading, setLoading]     = useState(true)

    useEffect(() => {
        setLoading(true)
        setMovies([])
        loadMovies(activeTab, genreId, tmdbLang)
            .then(setMovies)
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [activeTab, genreId, lang])

    const tabs = TABS_LABELS[lang]


    return (
        <div style={{ minHeight: '100vh', color: 'var(--fg)' }}>
            <Breadcrumbs />

            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

                {/* Заголовок + бейдж жанра */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                        {PAGE_TITLE[lang]}
                    </h1>
                    {genreId && (
                        <>
              <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 12px', borderRadius: 20,
                  background: 'var(--accent)', color: 'var(--accent-fg)',
                  fontSize: 13, fontWeight: 600,
              }}>
                🎭 {genreName}
              </span>
                            <button onClick={() => setSearchParams({})} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 20,
                                border: '1px solid var(--border-strong)',
                                background: 'var(--surface-2)', color: 'var(--fg-muted)',
                                fontSize: 12, cursor: 'pointer', transition: 'color 0.15s',
                            }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--fg-muted)')}
                            >
                                ✕ {CLEAR_LABEL[lang]}
                            </button>
                        </>
                    )}
                </div>

                {/* Табы */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 32 }}>
                    {(['now', 'soon', 'archive'] as TabKey[]).map(key => (
                        <button key={key} onClick={() => setActiveTab(key)} style={{
                            padding: '10px 20px', fontSize: 14, background: 'none', border: 'none',
                            cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.15s',
                            fontWeight: activeTab === key ? 600 : 400,
                            color: activeTab === key ? 'var(--fg)' : 'var(--fg-muted)',
                            borderBottom: `2px solid ${activeTab === key ? 'var(--accent)' : 'transparent'}`,
                            marginBottom: -1,
                        }}>
                            {tabs[key]}
                            <span style={{ marginLeft: 6, fontSize: 11, fontFamily: 'monospace', opacity: activeTab === key ? 0.7 : 0.3 }}>
                {!loading ? movies.length : ''}
              </span>
                        </button>
                    ))}
                </div>

                {loading
                    ? <GridSkeleton />
                    : movies.length === 0
                        ? <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>Нічого не знайдено</p>
                        : <MovieGrid movies={movies} cardWidth={140} rows={15} onMovieClick={id => navigate(`/movie/${id}`)} />
                }
            </div>
        </div>
    )
}