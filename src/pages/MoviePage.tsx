import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Breadcrumbs from '../components/Breadcrumbs'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'
const LANG_TMDB: Record<string, string> = { uk: 'uk-UA', en: 'en-US', ru: 'ru-RU' }

const FORMAT_COLORS: Record<string, string> = {
    IMAX: '#8b5cf6', ATMOS: '#3b82f6', LUX: '#0ea5e9',
    VIP: '#f59e0b', CHILL: '#10b981', SDH: '#6b7280',
    ScreenX: '#ec4899', Dolby: '#3b82f6',
}
function fmtColor(fmt: string): string {
    const entry = Object.entries(FORMAT_COLORS).find(([k]) => fmt.toUpperCase().includes(k.toUpperCase()))
    return entry?.[1] ?? '#6b7280'
}

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

interface ScheduleSession { time: string; format: string; sessionId: string }
interface ScheduleCinema  { id: string; name: string; city: string; sessions: ScheduleSession[] }

// ─── Sub-components ───────────────────────────────────────────────────────────

function GenreTags({ genres, onGenreClick, title }: {
    genres: { id: number; name: string }[]
    onGenreClick: (id: number, name: string) => void
    title: string
}) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {genres.map(g => (
                <button key={g.id} onClick={() => onGenreClick(g.id, g.name)} title={title}
                        style={{ padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: 'var(--fg)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-fg)'; e.currentTarget.style.borderColor = 'var(--accent)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.color = 'var(--fg)'; e.currentTarget.style.borderColor = 'var(--border-strong)' }}
                >{g.name}</button>
            ))}
        </div>
    )
}

function MovieGrid({ movies, cardWidth = 160 }: { movies: SimilarMovie[]; cardWidth?: number }) {
    const gap = 12
    const posterHeight = Math.round(cardWidth * 1.5)
    return (
        <div style={{ display: 'flex', gap, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }} className="[&::-webkit-scrollbar]:hidden">
            {movies.map(s => (
                <Link key={s.id} to={`/movie/${s.id}`} className="group" style={{ flexShrink: 0, width: cardWidth, textDecoration: 'none' }}>
                    <div style={{ width: cardWidth, height: posterHeight, borderRadius: 10, overflow: 'hidden', marginBottom: 8, background: 'var(--surface-2)' }}>
                        {s.poster_path
                            ? <img src={`https://image.tmdb.org/t/p/w200${s.poster_path}`} alt={s.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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

function DetailRow({ label, value, underline, muted }: { label: string; value: string; underline?: boolean; muted?: boolean }) {
    return (
        <div style={{ display: 'flex', gap: 8, fontSize: 14 }}>
            <dt style={{ flexShrink: 0, width: 176, color: 'var(--fg-subtle)' }}>{label}:</dt>
            <dd style={{ textDecoration: underline ? 'underline' : 'none', color: muted ? 'var(--fg-muted)' : 'var(--fg)' }}>{value}</dd>
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
                    {Array(6).fill(0).map((_, i) => <div key={i} style={{ height: 14, width: '50%', borderRadius: 4, background: 'var(--surface-2)' }} />)}
                </div>
                <div style={{ height: 360, borderRadius: 16, background: 'var(--surface-2)' }} />
            </div>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MoviePage() {
    const { id }       = useParams<{ id: string }>()
    const { lang }     = useApp()
    const navigate     = useNavigate()
    const t            = LABELS[lang]

    // TMDB state
    const [movie, setMovie]           = useState<MovieDetail | null>(null)
    const [director, setDirector]     = useState('')
    const [cast, setCast]             = useState<CastMember[]>([])
    const [similar, setSimilar]       = useState<SimilarMovie[]>([])
    const [sameGenre, setSameGenre]   = useState<SimilarMovie[]>([])
    const [comingSoon, setComingSoon] = useState<SimilarMovie[]>([])
    const [loading, setLoading]       = useState(true)

    // Schedule state
    const [allCinemasRaw, setAllCinemasRaw]     = useState<any[]>([])
    const [cinemaSchedule, setCinemaSchedule]   = useState<ScheduleCinema[]>([])
    const [userCity, setUserCity]               = useState<string | null>(null)
    const [scheduleDate, setScheduleDate]       = useState(new Date().toISOString().slice(0, 10))

    // ── Load TMDB ──────────────────────────────────────────────────────────
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
        ]).then(async ([details, credits, similarData, upcomingData]) => {
            setMovie(details)
            setDirector(credits.crew?.find((c: CrewMember) => c.job === 'Director')?.name ?? '—')
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
        }).catch(() => setMovie(null)).finally(() => setLoading(false))
    }, [id, lang])

    // ── Load all cinemas from Firebase (once) ──────────────────────────────
    useEffect(() => {
        if (!id) return
        const movieIdNum = Number(id)

        getDocs(collection(db, 'cinemas')).then(snapshot => {
            const cinemas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            setAllCinemasRaw(cinemas)

            // Определяем город — первый где вообще есть хоть один сеанс этого фильма (любая дата)
            for (const c of cinemas as any[]) {
                const has = (c.sessions ?? []).some((s: any) => s.movieId === movieIdNum)
                if (has) {
                    setUserCity(c.city)
                    break
                }
            }
        })
    }, [id])

    // ── Recalculate schedule when date / city / cinemas change ─────────────
    useEffect(() => {
        if (!allCinemasRaw.length || !id) return
        const movieIdNum = Number(id)

        // Фильтруем по выбранному городу
        const filtered = userCity
            ? allCinemasRaw.filter((c: any) => c.city?.toLowerCase() === userCity.toLowerCase())
            : allCinemasRaw

        const schedule: ScheduleCinema[] = (filtered as any[])
            .map((c: any) => ({
                id:   c.id,
                name: c.name,
                city: c.city ?? '',
                sessions: (c.sessions ?? [])
                    .filter((s: any) => s.movieId === movieIdNum && s.date === scheduleDate)
                    .sort((a: any, b: any) => a.time.localeCompare(b.time))
                    .map((s: any) => ({ time: s.time, format: s.format, sessionId: s.id })),
            }))
            .filter(c => c.sessions.length > 0)

        setCinemaSchedule(schedule)
    }, [allCinemasRaw, userCity, scheduleDate, id])

    // ── Derived ─────────────────────────────────────────────────────────────
    if (loading) return <PageSkeleton />
    if (!movie)  return (
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

    const goToGenre = (genreId: number, genreName: string) =>
        navigate(`/movies?genre=${genreId}&genreName=${encodeURIComponent(genreName)}`)

    // Все уникальные города из Firebase
    const allCities = Array.from(new Set((allCinemasRaw as any[]).map((c: any) => c.city).filter(Boolean))).sort() as string[]

    // 7 дней для табов
    const dateTabs = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return { key: d.toISOString().slice(0, 10), day: d.getDate(), dayName: ['НД','ПН','ВТ','СР','ЧТ','ПТ','СБ'][d.getDay()], isToday: i === 0 }
    })

    return (
        <div style={{ color: 'var(--fg)' }}>
            <div style={{ maxWidth: '90%', margin: '0 auto', padding: '24px', minHeight: '100vh' }}>

                <Breadcrumbs items={[
                    { label: 'Головна',  to: '/' },
                    { label: 'Фільми',   to: '/movies' },
                    { label: movie.title },   // ← текущая страница, без to
                ]} />


                <div style={{ display: 'grid', gap: 40, gridTemplateColumns: '2fr 5.5fr 2fr' }}>

                    {/* ── Постер ─────────────────────────────────────────── */}
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
                        <button
                            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderRadius: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--fg)', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                        >
                            ▶ {t.watchTrailer}
                        </button>
                    </div>

                    {/* ── Деталі ─────────────────────────────────────────── */}
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: 24, letterSpacing: '-0.02em' }}>{movie.title}</h1>
                        <dl style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <DetailRow label={t.ageLimit}   value={ageLimit} underline />
                            <DetailRow label={t.year}       value={year} />
                            <DetailRow label={t.original}   value={movie.original_title} muted />
                            <DetailRow label={t.director}   value={director} />
                            <DetailRow label={t.userRating} value={`${userRating}%`} />
                            <div style={{ display: 'flex', gap: 8, fontSize: 14, alignItems: 'flex-start' }}>
                                <dt style={{ flexShrink: 0, width: 176, color: 'var(--fg-subtle)', paddingTop: 2 }}>{t.genre}:</dt>
                                <dd><GenreTags genres={movie.genres} onGenreClick={goToGenre} title={t.allInGenre} /></dd>
                            </div>
                            <DetailRow label={t.duration}   value={duration} />
                            <DetailRow label={t.production} value={country} />
                            <DetailRow label={t.language}   value={language} muted />
                            {cast.length > 0 && <DetailRow label={t.cast} value={cast.map(c => c.name).join(', ')} />}
                        </dl>

                        <p style={{ marginTop: 28, lineHeight: 1.7, fontSize: 14, color: 'var(--fg-muted)' }}>{movie.overview}</p>

                        {similar.length > 0 && (
                            <section style={{ marginTop: 40 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{t.similar}</h2>
                                <MovieGrid movies={similar} cardWidth={160} />
                            </section>
                        )}
                        {sameGenre.length > 0 && (
                            <section style={{ marginTop: 32 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                                    <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{t.sameGenre}{firstGenreName ? `: ${firstGenreName}` : ''}</h2>
                                    {firstGenreId && (
                                        <button onClick={() => goToGenre(firstGenreId, firstGenreName)} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                                            {t.allInGenre} →
                                        </button>
                                    )}
                                </div>
                                <MovieGrid movies={sameGenre} cardWidth={160} />
                            </section>
                        )}
                        {comingSoon.length > 0 && (
                            <section style={{ marginTop: 32, marginBottom: 40 }}>
                                <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{t.comingSoon}</h2>
                                <MovieGrid movies={comingSoon} cardWidth={160} />
                            </section>
                        )}
                    </div>

                    {/* ── Розклад сеансів ─────────────────────────────────── */}
                    <div>
                        <div className="rounded-2xl p-4 space-y-3 bg-white/5 border border-white/10">
                            <h2 className="text-[15px] font-semibold">{t.schedule}</h2>

                            {/* Вибір міста */}
                            {allCities.length > 1 && (
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Місто</p>
                                    <select
                                        value={userCity ?? ''}
                                        onChange={e => setUserCity(e.target.value)}
                                        className="w-full rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500 border border-white/10 bg-white/5"
                                    >
                                        {allCities.map(city => (
                                            <option key={city} value={city} className="bg-zinc-900 text-white">{city}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Вибір дати */}
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Дата</p>
                                <div className="flex gap-1 overflow-x-auto pb-0.5 [&::-webkit-scrollbar]:hidden">
                                    {dateTabs.map(tab => {
                                        const active = scheduleDate === tab.key
                                        return (
                                            <button
                                                key={tab.key}
                                                onClick={() => setScheduleDate(tab.key)}
                                                className="shrink-0 flex flex-col items-center px-2 py-1.5 rounded-xl border transition-all duration-150 min-w-[36px]"
                                                style={{
                                                    background:   active ? '#dc2626' : 'rgba(255,255,255,0.04)',
                                                    borderColor:  active ? '#dc2626' : 'rgba(255,255,255,0.1)',
                                                    color:        active ? '#fff'    : '#9ca3af',
                                                }}
                                            >
                                                <span className="text-[9px] opacity-70 uppercase">{tab.isToday ? 'Сьог' : tab.dayName}</span>
                                                <span className="text-sm font-bold leading-none mt-0.5">{tab.day}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Підпис міста та дати */}
                            {userCity && (
                                <p className="text-[11px] text-zinc-500 flex items-center gap-1">
                                    📍 {userCity} · {new Date(scheduleDate + 'T00:00:00').toLocaleDateString(
                                    lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US',
                                    { day: 'numeric', month: 'long' }
                                )}
                                </p>
                            )}

                            {/* Список кінотеатрів */}
                            {cinemaSchedule.length === 0 ? (
                                <div className="flex flex-col items-center py-6 gap-2 text-zinc-600">
                                    <span className="text-3xl">🎬</span>
                                    <p className="text-xs">Немає сеансів на цю дату</p>
                                    <p className="text-[10px] text-zinc-700">Спробуйте іншу дату або місто</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {cinemaSchedule.map(cinema => (
                                        <div key={cinema.id} className="space-y-2">
                                            <Link
                                                to={`/cinema/${cinema.id}`}
                                                className="text-sm font-semibold text-white hover:text-red-400 transition-colors flex items-center justify-between group"
                                            >
                                                <span>{cinema.name}</span>
                                                <span className="text-zinc-600 group-hover:text-red-400 transition-colors text-xs">→</span>
                                            </Link>
                                            <div className="grid grid-cols-3 gap-1.5">
                                                {cinema.sessions.map((s, i) => {
                                                    const color = fmtColor(s.format)
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => navigate(`/cart/${cinema.id}_${s.sessionId}/seatplan`)}
                                                            className="flex flex-col items-center py-2 px-1 rounded-xl border transition-all duration-150"
                                                            style={{ borderColor: `${color}33`, background: `${color}11` }}
                                                            onMouseEnter={e => { e.currentTarget.style.background = `${color}25`; e.currentTarget.style.borderColor = `${color}88` }}
                                                            onMouseLeave={e => { e.currentTarget.style.background = `${color}11`; e.currentTarget.style.borderColor = `${color}33` }}
                                                        >
                                                            <span className="text-red-400 font-bold text-[13px] leading-none">{s.time}</span>
                                                            <span
                                                                className="text-[9px] mt-1 font-semibold w-full text-center overflow-hidden text-ellipsis whitespace-nowrap px-1"
                                                                style={{ color }}
                                                            >
                                                                {s.format}
                                                            </span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}