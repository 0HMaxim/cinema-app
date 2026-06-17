import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Breadcrumbs from '../components/Breadcrumbs'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

const LABELS: Record<string, Record<string, string>> = {
    uk: {
        ageLimit: 'Вікові обмеження', year: 'Рік', original: 'Оригінальна назва',
        director: 'Режисер', userRating: 'Рейтинг глядачів', language: 'Мова',
        genre: 'Жанр', duration: 'Тривалість', production: 'Виробництво',
        cast: 'У головних ролях', watchTrailer: 'Дивитись трейлер', similar: 'Дивіться також',
        sameGenre: 'Фільми у жанрі', comingSoon: 'Скоро в прокаті',
        schedule: 'Розклад сеансів', notFound: 'Фільм не знайдено',
        allInGenre: 'Всі фільми жанру',
    },
    en: {
        ageLimit: 'Age rating', year: 'Year', original: 'Original title',
        director: 'Director', userRating: 'User rating', language: 'Language',
        genre: 'Genre', duration: 'Runtime', production: 'Production',
        cast: 'Starring', watchTrailer: 'Watch trailer', similar: 'You may also like',
        sameGenre: 'More in genre', comingSoon: 'Coming soon',
        schedule: 'Showtimes', notFound: 'Movie not found',
        allInGenre: 'All movies in genre',
    },
    ru: {
        ageLimit: 'Возрастные ограничения', year: 'Год', original: 'Оригинальное название',
        director: 'Режиссёр', userRating: 'Рейтинг зрителей', language: 'Язык',
        genre: 'Жанр', duration: 'Длительность', production: 'Производство',
        cast: 'В главных ролях', watchTrailer: 'Смотреть трейлер', similar: 'Смотрите также',
        sameGenre: 'Фильмы в жанре', comingSoon: 'Скоро в прокате',
        schedule: 'Расписание сеансов', notFound: 'Фильм не найден',
        allInGenre: 'Все фильмы жанра',
    },
}

interface MovieDetail {
    id: number; title: string; original_title: string; overview: string
    poster_path: string | null; vote_average: number; release_date: string
    runtime: number; genres: { id: number; name: string }[]
    production_countries: { name: string }[]
    spoken_languages: { name: string; english_name: string }[]
}
interface CrewMember { name: string; job: string }
interface CastMember { name: string }
interface SimilarMovie { id: number; title: string; poster_path: string | null; release_date?: string }

const CINEMAS = [
    { name: 'Respublika Park IMAX', sessions: [
            { time: '10:30', format: 'IMAX L 2D' }, { time: '11:10', format: 'LUX SDH' },
            { time: '13:30', format: 'IMAX L 2D' }, { time: '16:30', format: 'IMAX L 2D' },
            { time: '19:30', format: 'IMAX L 2D' }, { time: '20:10', format: 'LUX SDH' },
        ]},
    { name: 'Lavina IMAX Laser', sessions: [
            { time: '10:10', format: 'SDH' }, { time: '10:30', format: 'IMAX L 2D' },
            { time: '13:00', format: 'ATMOS LUX' }, { time: '16:00', format: 'ATMOS LUX' },
            { time: '19:00', format: 'ATMOS LUX' }, { time: '19:30', format: 'IMAX L 2D' },
        ]},
    { name: 'Retroville ScreenX', sessions: [
            { time: '10:10', format: 'SDH' }, { time: '13:00', format: 'SDH' },
            { time: '16:00', format: 'SDH' }, { time: '19:00', format: 'SDH' },
        ]},
    { name: 'Проспект', sessions: [
            { time: '10:30', format: 'SDH' }, { time: '13:30', format: 'SDH' },
            { time: '17:00', format: 'CHILL OUT' }, { time: '20:00', format: 'CHILL OUT' },
        ]},
]



// Вынеси ЗА пределы MoviePage, перед ним
function GenreTags({ genres, onGenreClick, title }: {
    genres: { id: number; name: string }[]
    onGenreClick: (id: number, name: string) => void
    title: string
}) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {genres.map(g => (
                <button
                    key={g.id}
                    onClick={() => onGenreClick(g.id, g.name)}
                    title={title}
                    style={{
                        padding: '3px 10px', borderRadius: 20,
                        border: '1px solid var(--border-strong)',
                        background: 'var(--surface-2)', color: 'var(--fg)',
                        fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--accent)'
                        e.currentTarget.style.color = 'var(--accent-fg)'
                        e.currentTarget.style.borderColor = 'var(--accent)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--surface-2)'
                        e.currentTarget.style.color = 'var(--fg)'
                        e.currentTarget.style.borderColor = 'var(--border-strong)'
                    }}
                >
                    {g.name}
                </button>
            ))}
        </div>
    )
}



function MovieGrid({ movies, cardWidth = 160 }: {
    movies: SimilarMovie[]; cardWidth?: number
}) {
    const gap = 12
    const posterHeight = Math.round(cardWidth * 1.5)

    return (
        <div style={{
            display: 'flex',
            gap,
            overflowX: 'auto',
            paddingBottom: 8,           // место для скроллбара
            scrollbarWidth: 'none',     // Firefox — скрыть скроллбар
        }}
            // Chrome — скрыть скроллбар
             className="[&::-webkit-scrollbar]:hidden"
        >
            {movies.map(s => (
                <Link key={s.id} to={`/movie/${s.id}`} className="group"
                      style={{ flexShrink: 0, width: cardWidth, textDecoration: 'none' }}
                >
                    <div style={{
                        width: cardWidth, height: posterHeight,
                        borderRadius: 10, overflow: 'hidden',
                        marginBottom: 8, background: 'var(--surface-2)',
                    }}>
                        {s.poster_path
                            ? <img src={`https://image.tmdb.org/t/p/w200${s.poster_path}`} alt={s.title}
                                   className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: 20 }}>🎬</div>
                        }
                    </div>
                    <p className="text-xs leading-tight line-clamp-2" style={{ color: 'var(--fg-muted)' }}>{s.title}</p>
                    {s.release_date && <p style={{ fontSize: 10, marginTop: 2, color: 'var(--fg-subtle)' }}>{s.release_date.slice(0, 7)}</p>}
                </Link>
            ))}
        </div>
    )
}

export default function MoviePage() {
    const { id } = useParams<{ id: string }>()
    const { lang } = useApp()
    const navigate = useNavigate()
    const [movie, setMovie]           = useState<MovieDetail | null>(null)
    const [director, setDirector]     = useState('')
    const [cast, setCast]             = useState<CastMember[]>([])
    const [similar, setSimilar]       = useState<SimilarMovie[]>([])
    const [sameGenre, setSameGenre]   = useState<SimilarMovie[]>([])
    const [comingSoon, setComingSoon] = useState<SimilarMovie[]>([])
    const [loading, setLoading]       = useState(true)

    const t = LABELS[lang]

    useEffect(() => {
        if (!id) return
        setLoading(true)
        const headers  = { Authorization: `Bearer ${TMDB_TOKEN}` }
        const tmdbLang = LANG_TMDB[lang]

        Promise.all([
            fetch(`https://api.themoviedb.org/3/movie/${id}?language=${tmdbLang}`, { headers }).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/movie/${id}/credits?language=${tmdbLang}`, { headers }).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/movie/${id}/similar?language=${tmdbLang}`, { headers }).then(r => r.json()),
            fetch(`https://api.themoviedb.org/3/movie/upcoming?language=${tmdbLang}&page=1`, { headers }).then(r => r.json()),
        ])
            .then(async ([details, credits, similarData, upcomingData]) => {
                setMovie(details)
                const dir = credits.crew?.find((c: CrewMember) => c.job === 'Director')
                setDirector(dir?.name ?? '—')
                setCast(credits.cast?.slice(0, 6) ?? [])
                setSimilar(similarData.results?.slice(0, 20) ?? [])
                setComingSoon(upcomingData.results?.slice(0, 20) ?? [])

                const firstGenreId = details.genres?.[0]?.id
                if (firstGenreId) {
                    const genreRes = await fetch(
                        `https://api.themoviedb.org/3/discover/movie?language=${tmdbLang}&with_genres=${firstGenreId}&sort_by=popularity.desc&page=1`,
                        { headers }
                    ).then(r => r.json())
                    setSameGenre((genreRes.results ?? []).filter((m: SimilarMovie) => m.id !== Number(id)).slice(0, 20))
                }
            })
            .catch(() => setMovie(null))
            .finally(() => setLoading(false))
    }, [id, lang])

    if (loading) return <PageSkeleton />
    if (!movie) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>
            <p>{t.notFound}</p>
        </div>
    )

    const ageLimit       = '12+'
    const year           = movie.release_date?.slice(0, 4) ?? '—'
    const hours          = Math.floor(movie.runtime / 60)
    const mins           = movie.runtime % 60
    const duration       = movie.runtime ? `${hours}:${mins.toString().padStart(2, '0')}` : '—'
    const firstGenreName = movie.genres?.[0]?.name ?? ''
    const firstGenreId   = movie.genres?.[0]?.id
    const country        = movie.production_countries?.[0]?.name || '—'
    const language       = movie.spoken_languages?.[0]?.name || '—'
    const userRating     = movie.vote_average ? Math.round(movie.vote_average * 10) : 0
    const poster         = movie.poster_path ? `https://image.tmdb.org/t/p/w400${movie.poster_path}` : null

    // Переход на /movie?genre=ID&genreName=Name
    const goToGenre = (genreId: number, genreName: string) =>
        navigate(`/movies?genre=${genreId}&genreName=${encodeURIComponent(genreName)}`)


    return (
        <div style={{ color: 'var(--fg)' }}>
            <div style={{ maxWidth: '90%', margin: '0 auto', padding: '24px', minHeight: '100vh' }}>
                <Breadcrumbs />

                <div style={{ display: 'grid', gap: 40, gridTemplateColumns: '2fr 5.5fr 2fr' }}>

                    {/* Постер */}
                    <div>
                        <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', marginBottom: 12 }}>
                            {poster
                                ? <img src={poster} alt={movie.title} style={{ width: '100%', display: 'block' }} />
                                : <div style={{ aspectRatio: '2/3', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg-subtle)', fontSize: 36 }}>🎬</div>
                            }
                            <span style={{ position: 'absolute', bottom: 8, right: 8, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {ageLimit}
              </span>
                        </div>
                        <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                        >
                            ▶ {t.watchTrailer}
                        </button>
                    </div>

                    {/* Детали */}
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em' }}>
                            {movie.title}
                        </h1>

                        <dl style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <DetailRow label={t.ageLimit}   value={ageLimit} underline />
                            <DetailRow label={t.year}       value={year} />
                            <DetailRow label={t.original}   value={movie.original_title} muted />
                            <DetailRow label={t.director}   value={director} />
                            <DetailRow label={t.userRating} value={`${userRating}%`} />

                            {/* Жанры — особая строка с тегами */}
                            <div style={{ display: 'flex', gap: 8, fontSize: 14, alignItems: 'flex-start' }}>
                                <dt style={{ flexShrink: 0, width: 176, color: 'var(--fg-subtle)', paddingTop: 2 }}>{t.genre}:</dt>
                                <dd>
                                    <GenreTags
                                        genres={movie.genres}
                                        onGenreClick={goToGenre}
                                        title={t.allInGenre}
                                    />
                                </dd>
                            </div>

                            <DetailRow label={t.duration}   value={duration} />
                            <DetailRow label={t.production} value={country} />
                            <DetailRow label={t.language}   value={language} muted />
                            {cast.length > 0 && <DetailRow label={t.cast} value={cast.map(c => c.name).join(', ')} />}
                        </dl>

                        <p style={{ marginTop: 28, lineHeight: 1.7, fontSize: 14, color: 'var(--fg-muted)' }}>
                            {movie.overview}
                        </p>

                        {similar.length > 0 && (
                            <section style={{ marginTop: 40 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{t.similar}</h2>
                                <MovieGrid movies={similar} cardWidth={160} />
                            </section>
                        )}

                        {sameGenre.length > 0 && (
                            <section style={{ marginTop: 32 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>
                                        {t.sameGenre}{firstGenreName ? `: ${firstGenreName}` : ''}
                                    </h2>
                                    {/* Ссылка «Показать все» */}
                                    {firstGenreId && (
                                        <button
                                            onClick={() => goToGenre(firstGenreId, firstGenreName)}
                                            style={{
                                                fontSize: 12, color: 'var(--accent)', background: 'none',
                                                border: 'none', cursor: 'pointer', padding: 0,
                                                textDecoration: 'underline', textUnderlineOffset: 3,
                                            }}
                                        >
                                            {t.allInGenre} →
                                        </button>
                                    )}
                                </div>
                                <MovieGrid movies={sameGenre} cardWidth={160}  />
                            </section>
                        )}

                        {comingSoon.length > 0 && (
                            <section style={{ marginTop: 32, marginBottom: 40 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{t.comingSoon}</h2>
                                <MovieGrid movies={comingSoon} cardWidth={160}  />
                            </section>
                        )}
                    </div>

                    {/* Расписание */}
                    <div>
                        <div style={{ borderRadius: 16, padding: 20, background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{t.schedule}</h2>
                            {CINEMAS.map(cinema => (
                                <div key={cinema.name} style={{ marginBottom: 20 }}>
                                    <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{cinema.name}</p>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                                        {cinema.sessions.map((s, i) => (
                                            <button key={i} style={{ padding: '6px 4px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center' }}
                                                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                                                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                                            >
                                                <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, lineHeight: 1 }}>{s.time}</div>
                                                <div style={{ fontSize: 9, color: 'var(--fg-subtle)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.format}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}

function DetailRow({ label, value, underline, muted }: {
    label: string; value: string; underline?: boolean; muted?: boolean
}) {
    return (
        <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
            <dt style={{ flexShrink: 0, width: 176, color: 'var(--fg-subtle)' }}>{label}:</dt>
            <dd style={{ textDecoration: underline ? 'underline' : 'none', color: muted ? 'var(--fg-muted)' : 'var(--fg)' }}>
                {value}
            </dd>
        </div>
    )
}

function PageSkeleton() {
    return (
        <div style={{ minHeight: '100vh', padding: 24 }} className="animate-pulse">
            <div style={{ maxWidth: '90%', margin: '0 auto', display: 'grid', gap: 40, gridTemplateColumns: '240px 1fr 320px' }}>
                <div style={{ aspectRatio: '2/3', borderRadius: 14, background: 'var(--surface-2)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ height: 36, width: '60%', borderRadius: 8, background: 'var(--surface-2)' }} />
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} style={{ height: 14, width: '50%', borderRadius: 4, background: 'var(--surface-2)' }} />
                    ))}
                </div>
                <div style={{ height: 360, borderRadius: 16, background: 'var(--surface-2)' }} />
            </div>
        </div>
    )
}