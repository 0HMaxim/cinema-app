import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import Breadcrumbs from '../components/Breadcrumbs'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { MapPin, Star, Clock, Globe, Film, ChevronRight } from 'lucide-react'

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN
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
        allInGenre: 'Всі фільми жанру', city: 'Місто', date: 'Дата',
        noSessions: 'Немає сеансів на цю дату', tryOther: 'Спробуйте іншу дату або місто',
        today: 'Сьог',
    },
    en: {
        ageLimit: 'Age rating', year: 'Year', original: 'Original title',
        director: 'Director', userRating: 'User rating', language: 'Language',
        genre: 'Genre', duration: 'Runtime', production: 'Production',
        cast: 'Starring', watchTrailer: 'Watch trailer', similar: 'You may also like',
        sameGenre: 'More in genre', comingSoon: 'Coming soon',
        schedule: 'Showtimes', notFound: 'Movie not found',
        allInGenre: 'All in genre', city: 'City', date: 'Date',
        noSessions: 'No sessions on this date', tryOther: 'Try another date or city',
        today: 'Today',
    },
    ru: {
        ageLimit: 'Возрастные ограничения', year: 'Год', original: 'Оригинальное название',
        director: 'Режиссёр', userRating: 'Рейтинг зрителей', language: 'Язык',
        genre: 'Жанр', duration: 'Длительность', production: 'Производство',
        cast: 'В главных ролях', watchTrailer: 'Смотреть трейлер', similar: 'Смотрите также',
        sameGenre: 'Фильмы в жанре', comingSoon: 'Скоро в прокате',
        schedule: 'Расписание сеансов', notFound: 'Фильм не найден',
        allInGenre: 'Все фильмы жанра', city: 'Город', date: 'Дата',
        noSessions: 'Нет сеансов на эту дату', tryOther: 'Попробуйте другую дату или город',
        today: 'Сег',
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
interface ScheduleCinema { id: string; name: string; city: string; sessions: ScheduleSession[] }

// ─── Sub-components ───────────────────────────────────────────────────────────

function MovieGrid({ movies }: { movies: SimilarMovie[] }) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden">
            {movies.map(m => (
                <Link key={m.id} to={`/movie/${m.id}`} className="group shrink-0 w-28">
                    <div className="w-28 h-40 rounded-xl overflow-hidden mb-2 bg-[color:var(--surface-2)]">
                        {m.poster_path
                            ? <img src={`https://image.tmdb.org/t/p/w200${m.poster_path}`} alt={m.title}
                                   className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                            : <div className="w-full h-full flex items-center justify-center text-[color:var(--fg-subtle)]">
                                <Film size={24} />
                            </div>
                        }
                    </div>
                    <p className="text-xs leading-tight line-clamp-2 text-[color:var(--fg-muted)] group-hover:text-[color:var(--fg)] transition-colors">
                        {m.title}
                    </p>
                    {m.release_date && (
                        <p className="text-[10px] mt-0.5 text-[color:var(--fg-subtle)]">{m.release_date.slice(0, 7)}</p>
                    )}
                </Link>
            ))}
        </div>
    )
}

function PageSkeleton() {
    return (
        <div className="min-h-screen p-6 animate-pulse">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-[220px_1fr_300px] gap-8">
                <div className="aspect-[2/3] rounded-2xl bg-[color:var(--surface-2)]" />
                <div className="flex flex-col gap-4">
                    <div className="h-8 w-2/3 rounded-lg bg-[color:var(--surface-2)]" />
                    {Array(6).fill(0).map((_, i) => (
                        <div key={i} className="h-4 w-1/2 rounded bg-[color:var(--surface-2)]" />
                    ))}
                </div>
                <div className="h-80 rounded-2xl bg-[color:var(--surface-2)]" />
            </div>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function MoviePage() {
    const { id }    = useParams<{ id: string }>()
    const { lang }  = useApp()
    const navigate  = useNavigate()
    const t         = LABELS[lang]

    const [movie, setMovie]           = useState<MovieDetail | null>(null)
    const [director, setDirector]     = useState('')
    const [cast, setCast]             = useState<CastMember[]>([])
    const [similar, setSimilar]       = useState<SimilarMovie[]>([])
    const [sameGenre, setSameGenre]   = useState<SimilarMovie[]>([])
    const [comingSoon, setComingSoon] = useState<SimilarMovie[]>([])
    const [loading, setLoading]       = useState(true)

    const [allCinemasRaw, setAllCinemasRaw]   = useState<any[]>([])
    const [cinemaSchedule, setCinemaSchedule] = useState<ScheduleCinema[]>([])
    const [userCity, setUserCity]             = useState<string | null>(null)
    const [scheduleDate, setScheduleDate]     = useState(new Date().toISOString().slice(0, 10))

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

    useEffect(() => {
        if (!id) return
        const movieIdNum = Number(id)
        getDocs(collection(db, 'cinemas')).then(snapshot => {
            const cinemas = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            setAllCinemasRaw(cinemas)
            for (const c of cinemas as any[]) {
                const has = (c.sessions ?? []).some((s: any) => s.movieId === movieIdNum)
                if (has) { setUserCity(c.city); break }
            }
        })
    }, [id])

    useEffect(() => {
        if (!allCinemasRaw.length || !id) return
        const movieIdNum = Number(id)
        const filtered = userCity
            ? allCinemasRaw.filter((c: any) => c.city?.toLowerCase() === userCity.toLowerCase())
            : allCinemasRaw

        const schedule: ScheduleCinema[] = (filtered as any[])
            .map((c: any) => ({
                id: c.id, name: c.name, city: c.city ?? '',
                sessions: (c.sessions ?? [])
                    .filter((s: any) => s.movieId === movieIdNum && s.date === scheduleDate)
                    .sort((a: any, b: any) => a.time.localeCompare(b.time))
                    .map((s: any) => ({ time: s.time, format: s.format, sessionId: s.id })),
            }))
            .filter(c => c.sessions.length > 0)

        setCinemaSchedule(schedule)
    }, [allCinemasRaw, userCity, scheduleDate, id])

    if (loading) return <PageSkeleton />
    if (!movie) return (
        <div className="min-h-screen flex items-center justify-center text-[color:var(--fg)]">
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

    const allCities = Array.from(new Set((allCinemasRaw as any[]).map((c: any) => c.city).filter(Boolean))).sort() as string[]

    const dateTabs = Array.from({ length: 7 }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return {
            key: d.toISOString().slice(0, 10),
            day: d.getDate(),
            dayName: ['НД','ПН','ВТ','СР','ЧТ','ПТ','СБ'][d.getDay()],
            isToday: i === 0,
        }
    })

    return (
        <div className="min-h-screen text-[color:var(--fg)]">
            <div className="max-w-[90%] mx-auto px-4 py-6 sm:px-6">

                <Breadcrumbs items={[
                    { label: 'Головна', to: '/' },
                    { label: 'Фільми',  to: '/movies' },
                    { label: movie.title },
                ]} />

                {/* ── Основная сетка ── */}
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[220px_1fr_300px] gap-6 lg:gap-10">

                    {/* ── Постер ── */}
                    <div className="flex flex-col gap-3">
                        <div className="relative rounded-2xl overflow-hidden">
                            {poster
                                ? <img src={poster} alt={movie.title} className="w-full block" />
                                : <div className="aspect-[2/3] bg-[color:var(--surface-2)] flex items-center justify-center text-[color:var(--fg-subtle)]">
                                    <Film size={40} />
                                </div>
                            }
                            <span className="absolute bottom-2 right-2 bg-red-600 text-white text-[11px] font-bold w-8 h-8 rounded-full flex items-center justify-center">
                                {ageLimit}
                            </span>
                        </div>

                        {/* Рейтинг под постером */}
                        <div className="flex items-center gap-2 px-1">
                            <Star size={16} className="text-yellow-400 fill-yellow-400" />
                            <span className="text-lg font-bold text-[color:var(--fg)]">{userRating}%</span>
                            <span className="text-xs text-[color:var(--fg-subtle)]">{t.userRating}</span>
                        </div>

                        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl
                                           bg-[color:var(--surface-2)] border border-[color:var(--border)]
                                           text-[color:var(--fg)] text-sm font-medium
                                           hover:bg-[color:var(--surface-3)] transition-colors">
                            ▶ {t.watchTrailer}
                        </button>
                    </div>

                    {/* ── Детали ── */}
                    <div className="min-w-0">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-6 tracking-tight text-[color:var(--fg)]">
                            {movie.title}
                        </h1>

                        <dl className="flex flex-col gap-3">
                            <DetailRow label={t.ageLimit}   value={ageLimit} />
                            <DetailRow label={t.year}       value={year} />
                            <DetailRow label={t.original}   value={movie.original_title} />
                            <DetailRow label={t.director}   value={director} />

                            {/* Жанры — кликабельные теги */}
                            <div className="flex gap-3 text-sm">
                                <dt className="shrink-0 w-36 text-[color:var(--fg-subtle)] pt-0.5">{t.genre}:</dt>
                                <dd className="flex flex-wrap gap-1.5">
                                    {movie.genres.map(g => (
                                        <button key={g.id} onClick={() => goToGenre(g.id, g.name)}
                                                className="px-2.5 py-0.5 rounded-full text-xs border border-[color:var(--border-strong)]
                                                           bg-[color:var(--surface-2)] text-[color:var(--fg)]
                                                           hover:bg-yellow-400 hover:text-black hover:border-yellow-400 transition-all">
                                            {g.name}
                                        </button>
                                    ))}
                                </dd>
                            </div>

                            <div className="flex gap-3 text-sm">
                                <dt className="shrink-0 w-36 text-[color:var(--fg-subtle)]">{t.duration}:</dt>
                                <dd className="flex items-center gap-1 text-[color:var(--fg)]">
                                    <Clock size={13} className="text-[color:var(--fg-subtle)]" />
                                    {duration}
                                </dd>
                            </div>

                            <DetailRow label={t.production} value={country} />

                            <div className="flex gap-3 text-sm">
                                <dt className="shrink-0 w-36 text-[color:var(--fg-subtle)]">{t.language}:</dt>
                                <dd className="flex items-center gap-1 text-[color:var(--fg-muted)]">
                                    <Globe size={13} className="text-[color:var(--fg-subtle)]" />
                                    {language}
                                </dd>
                            </div>

                            {cast.length > 0 && (
                                <DetailRow label={t.cast} value={cast.map(c => c.name).join(', ')} />
                            )}
                        </dl>

                        {/* Описание */}
                        {movie.overview && (
                            <p className="mt-6 text-sm leading-relaxed text-[color:var(--fg-muted)]">
                                {movie.overview}
                            </p>
                        )}

                        {/* Расписание — только на мобилке/планшете (lg скрыто в сайдбаре) */}
                        <div className="lg:hidden mt-8">
                            <ScheduleBlock
                                t={t} lang={lang}
                                allCities={allCities} userCity={userCity} setUserCity={setUserCity}
                                dateTabs={dateTabs} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate}
                                cinemaSchedule={cinemaSchedule} navigate={navigate}
                            />
                        </div>

                        {/* Похожие фильмы */}
                        {similar.length > 0 && (
                            <section className="mt-10">
                                <h2 className="text-sm font-semibold mb-3 text-[color:var(--fg)]">{t.similar}</h2>
                                <MovieGrid movies={similar} />
                            </section>
                        )}
                        {sameGenre.length > 0 && (
                            <section className="mt-8">
                                <div className="flex items-center gap-3 mb-3">
                                    <h2 className="text-sm font-semibold text-[color:var(--fg)]">
                                        {t.sameGenre}{firstGenreName ? `: ${firstGenreName}` : ''}
                                    </h2>
                                    {firstGenreId && (
                                        <button onClick={() => goToGenre(firstGenreId, firstGenreName)}
                                                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors underline underline-offset-2">
                                            {t.allInGenre} →
                                        </button>
                                    )}
                                </div>
                                <MovieGrid movies={sameGenre} />
                            </section>
                        )}
                        {comingSoon.length > 0 && (
                            <section className="mt-8 mb-10">
                                <h2 className="text-sm font-semibold mb-3 text-[color:var(--fg)]">{t.comingSoon}</h2>
                                <MovieGrid movies={comingSoon} />
                            </section>
                        )}
                    </div>

                    {/* ── Расписание — сайдбар (только lg+) ── */}
                    <div className="hidden lg:block">
                        <div className="sticky top-24">
                            <ScheduleBlock
                                t={t} lang={lang}
                                allCities={allCities} userCity={userCity} setUserCity={setUserCity}
                                dateTabs={dateTabs} scheduleDate={scheduleDate} setScheduleDate={setScheduleDate}
                                cinemaSchedule={cinemaSchedule} navigate={navigate}
                            />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}


function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="flex gap-3 text-sm">
            <dt className="shrink-0 w-36 text-[0.6875rem]" style={{ color: 'var(--fg-subtle)' }}>{label}:</dt>
            <dd className="text-[0.8125rem]" style={{ color: accent ? 'var(--accent)' : 'var(--fg)', fontWeight: accent ? 600 : 400 }}>
                {value}
            </dd>
        </div>
    )
}

function ScheduleBlock({ t, lang, allCities, userCity, setUserCity, dateTabs, scheduleDate, setScheduleDate, cinemaSchedule, navigate }: {
    t: Record<string, string>
    lang: string
    allCities: string[]
    userCity: string | null
    setUserCity: (c: string) => void
    dateTabs: { key: string; day: number; dayName: string; isToday: boolean }[]
    scheduleDate: string
    setScheduleDate: (d: string) => void
    cinemaSchedule: ScheduleCinema[]
    navigate: (path: string) => void
}) {
    return (
        <div className="rounded-2xl p-4 space-y-4"
             style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>{t.schedule}</h2>

            {/* Город */}
            {allCities.length > 1 && (
                <div>
                    <p className="text-[0.625rem] uppercase tracking-widest mb-1.5"
                       style={{ color: 'var(--fg-subtle)' }}>
                        {t.city}
                    </p>
                    <select
                        value={userCity ?? ''}
                        onChange={e => setUserCity(e.target.value)}
                        className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                        style={{
                            color: 'var(--fg)',
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                        }}
                    >
                        {allCities.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Дата */}
            <div>
                <p className="text-[0.625rem] uppercase tracking-widest mb-2"
                   style={{ color: 'var(--fg-subtle)' }}>{t.date}</p>
                <div className="flex gap-1 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                    {dateTabs.map(tab => {
                        const active = scheduleDate === tab.key
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setScheduleDate(tab.key)}
                                className="shrink-0 flex flex-col items-center px-2 py-1.5 rounded-xl border min-w-[2.375rem] transition-all duration-200"
                                style={active ? {
                                    background: 'var(--accent)',
                                    borderColor: 'var(--accent)',
                                    color: 'var(--accent-fg)',
                                } : {
                                    background: 'var(--surface-2)',
                                    borderColor: 'var(--border)',
                                    color: 'var(--fg-muted)',
                                }}
                            >
                                <span className="text-[0.5625rem] uppercase opacity-70">
                                    {tab.isToday ? t.today : tab.dayName}
                                </span>
                                <span className="text-sm font-bold leading-none mt-0.5">{tab.day}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Подпись города */}
            {userCity && (
                <p className="text-[0.6875rem] flex items-center gap-1"
                   style={{ color: 'var(--fg-subtle)' }}>
                    <MapPin size={11} />
                    {userCity} · {new Date(scheduleDate + 'T00:00:00').toLocaleDateString(
                    lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US',
                    { day: 'numeric', month: 'long' }
                )}
                </p>
            )}

            {/* Список кинотеатров */}
            {cinemaSchedule.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2">
                    <Film size={32} style={{ color: 'var(--fg-subtle)' }} />
                    <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>{t.noSessions}</p>
                    <p className="text-[0.625rem]" style={{ color: 'var(--fg-subtle)' }}>{t.tryOther}</p>
                </div>
            ) : (
                <div className="space-y-5">
                    {cinemaSchedule.map(cinema => (
                        <div key={cinema.id}>
                            <Link
                                to={`/cinema/${cinema.id}`}
                                className="flex items-center justify-between mb-2 group"
                            >
                                <span className="text-sm font-semibold transition-colors"
                                      style={{ color: 'var(--fg)' }}
                                      onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                                      onMouseLeave={e => e.currentTarget.style.color = 'var(--fg)'}>
                                    {cinema.name}
                                </span>
                                <ChevronRight size={14} style={{ color: 'var(--fg-subtle)' }} />
                            </Link>
                            <div className="grid grid-cols-3 gap-1.5">
                                {cinema.sessions.map((s, i) => {
                                    const color = fmtColor(s.format)
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => navigate(`/cart/${cinema.id}_${s.sessionId}/seatplan`)}
                                            className="flex flex-col items-center py-2 px-1 rounded-xl border hover:scale-[1.03] active:scale-95"
                                            style={{ borderColor: `${color}33`, background: `${color}11` }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.background = `${color}25`
                                                e.currentTarget.style.borderColor = `${color}88`
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.background = `${color}11`
                                                e.currentTarget.style.borderColor = `${color}33`
                                            }}
                                        >
                                            <span className="text-[0.8125rem] font-bold leading-none"
                                                  style={{ color: 'var(--fg)' }}>
                                                {s.time}
                                            </span>
                                            {s.format && (
                                                <span className="text-[0.5625rem] mt-1 font-semibold truncate w-full text-center px-1"
                                                      style={{ color }}>
                                                    {s.format}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}