import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import type { Cinema, Session } from '../models/cinema.ts'
import Breadcrumbs from "../components/Breadcrumbs.tsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDateTabs() {
    const days: { date: Date; label: string; key: string; dayName: string }[] = []
    const now = new Date()
    const dayNames = ['НД', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ']
    const monthNames = ['СІЧНЯ','ЛЮТОГО','БЕРЕЗНЯ','КВІТНЯ','ТРАВНЯ','ЧЕРВНЯ',
        'ЛИПНЯ','СЕРПНЯ','ВЕРЕСНЯ','ЖОВТНЯ','ЛИСТОПАДА','ГРУДНЯ']
    for (let i = 0; i < 7; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        days.push({
            date: d,
            label: `${d.getDate()} ${monthNames[d.getMonth()]}`,
            dayName: dayNames[d.getDay()],
            key: d.toISOString().slice(0, 10),
        })
    }
    return days
}

const FORMAT_COLORS: Record<string, string> = {
    'IMAX':   '#8b5cf6',
    'ATMOS':  '#3b82f6',
    'LUX':    '#0ea5e9',
    'VIP':    '#f59e0b',
    'CHILL':  '#10b981',
    'SDH':    '#6b7280',
    'ScreenX':'#ec4899',
    'Dolby':  '#3b82f6',
}

function fmtColor(fmt: string): string {
    for (const [k, v] of Object.entries(FORMAT_COLORS)) {
        if (fmt.toUpperCase().includes(k.toUpperCase())) return v
    }
    return '#6b7280'
}

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SessionWithCinema extends Session {
    cinemaId: string
    cinemaName: string
    cinemaCity: string
}

// ─── Session Button ───────────────────────────────────────────────────────────

function SessionBtn({
                        session,
                        currentCinemaId,
                    }: {
    session: SessionWithCinema
    currentCinemaId: string
}) {
    const navigate = useNavigate()
    const color = fmtColor(session.format)
    const isCurrent = session.cinemaId === currentCinemaId

    return (
        <button
            onClick={() => navigate(`/cart/${session.cinemaId}_${session.id}/seatplan`)}
            className="relative flex flex-col items-center px-3 py-2 rounded-xl border transition-all duration-150 min-w-[72px] group"
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
            {!isCurrent && (
                <span
                    className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full border border-zinc-900 flex items-center justify-center text-[7px]"
                    style={{ background: color }}
                    title={`${session.cinemaName}, ${session.cinemaCity}`}
                >✦</span>
            )}
            <span className="font-bold text-[15px] leading-none text-red-400">{session.time}</span>
            <span className="text-[9px] mt-1 font-semibold" style={{ color }}>{session.format}</span>
        </button>
    )
}

// ─── Movie Row ────────────────────────────────────────────────────────────────

function MovieRow({
                      movieId,
                      movieTitle,
                      sessions,
                      currentCinemaId,
                  }: {
    movieId: number
    movieTitle: string
    sessions: SessionWithCinema[]
    currentCinemaId: string
}) {
    const [poster, setPoster] = useState<string | null>(null)

    useEffect(() => {
        fetch(`https://api.themoviedb.org/3/movie/${movieId}?language=uk-UA`, {
            headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
        })
            .then(r => r.json())
            .then(d => { if (d.poster_path) setPoster(`https://image.tmdb.org/t/p/w200${d.poster_path}`) })
            .catch(() => {})
    }, [movieId])

    const currentSessions = sessions.filter(s => s.cinemaId === currentCinemaId)
    const othersByCinema = sessions
        .filter(s => s.cinemaId !== currentCinemaId)
        .reduce<Record<string, SessionWithCinema[]>>((acc, s) => {
            if (!acc[s.cinemaId]) acc[s.cinemaId] = []
            acc[s.cinemaId].push(s)
            return acc
        }, {})

    return (
        <div className="flex gap-4 items-start">
            {/* Постер */}
            <Link to={`/movie/${movieId}`} className="shrink-0">
                <div className="w-20 h-28 rounded-xl overflow-hidden bg-zinc-800 border border-white/10 hover:border-white/30 transition-colors">
                    {poster
                        ? <img src={poster} alt={movieTitle} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-2xl">🎬</div>
                    }
                </div>
            </Link>

            {/* Контент */}
            <div className="flex-1 min-w-0">
                <Link
                    to={`/movie/${movieId}`}
                    className="text-base font-semibold hover:underline text-white"
                >
                    {movieTitle}
                </Link>

                {/* Сеансы в этом кинотеатре */}
                {currentSessions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                        {currentSessions
                            .sort((a, b) => a.time.localeCompare(b.time))
                            .map(s => (
                                <SessionBtn key={s.id} session={s} currentCinemaId={currentCinemaId} />
                            ))}
                    </div>
                )}

                {/* Сеансы в других кинотеатрах города */}
                {Object.entries(othersByCinema).length > 0 && (
                    <div className="mt-3 space-y-2">
                        <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                            Також в інших кінотеатрах:
                        </p>
                        {Object.entries(othersByCinema).map(([cid, cSessions]) => (
                            <div key={cid} className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] text-zinc-400 shrink-0">
                                    {cSessions[0].cinemaName}
                                    <span className="text-zinc-600 ml-1">· {cSessions[0].cinemaCity}</span>
                                </span>
                                {cSessions
                                    .sort((a, b) => a.time.localeCompare(b.time))
                                    .map(s => (
                                        <SessionBtn key={s.id} session={s} currentCinemaId={currentCinemaId} />
                                    ))}
                            </div>
                        ))}
                    </div>
                )}

                {currentSessions.length === 0 && Object.entries(othersByCinema).length === 0 && (
                    <p className="text-xs text-zinc-600 mt-2">Немає сеансів на цю дату</p>
                )}
            </div>
        </div>
    )
}

// ─── Section Title ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold tracking-tight shrink-0 text-white">{children}</h2>
            <div className="flex-1 h-px bg-white/10" />
        </div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CinemaPage() {
    const { id } = useParams<{ id: string }>()

    const [allCinemas, setAllCinemas]     = useState<Cinema[]>([])
    const [loading, setLoading]           = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
    const [selectedFormat, setSelectedFormat] = useState('ALL')
    const [lightboxPhoto, setLightboxPhoto]   = useState<string | null>(null)

    const dateTabs = getDateTabs()

    // Загрузка всех кинотеатров из Firebase
    useEffect(() => {
        getDocs(collection(db, 'cinemas'))
            .then(snapshot => {
                setAllCinemas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Cinema)))
            })
            .finally(() => setLoading(false))
    }, [])

    const currentCinema = allCinemas.find(c => c.id === id) ?? null

    // Собираем сеансы фильмов по городу
    const allSessionsByMovie = (() => {
        if (!currentCinema) return []

        const map: Record<number, { movieId: number; movieTitle: string; sessions: SessionWithCinema[] }> = {}

        const cinemasInCity = allCinemas.filter(
            c => c.city.toLowerCase() === currentCinema.city.toLowerCase()
        )

        for (const c of cinemasInCity) {
            const sessions: Session[] = c.sessions ?? []
            for (const s of sessions) {
                if (s.date !== selectedDate) continue
                if (selectedFormat !== 'ALL' && !s.format.toUpperCase().includes(selectedFormat.toUpperCase())) continue

                if (!map[s.movieId]) {
                    map[s.movieId] = { movieId: s.movieId, movieTitle: s.movieTitle, sessions: [] }
                }
                map[s.movieId].sessions.push({
                    ...s,
                    cinemaId: c.id,
                    cinemaName: c.name,
                    cinemaCity: c.city,
                })
            }
        }

        return Object.values(map).sort((a, b) => {
            const aHas = a.sessions.some(s => s.cinemaId === id)
            const bHas = b.sessions.some(s => s.cinemaId === id)
            if (aHas && !bHas) return -1
            if (!aHas && bHas) return 1
            return a.movieTitle.localeCompare(b.movieTitle)
        })
    })()

    // Уникальные форматы по городу на выбранную дату
    const allFormats = Array.from(new Set(
        allCinemas
            .filter(c => currentCinema && c.city.toLowerCase() === currentCinema.city.toLowerCase())
            .flatMap(c => (c.sessions ?? []).filter(s => s.date === selectedDate).map(s => s.format.toUpperCase().trim()))
    )).sort()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-zinc-500 text-sm">
                Завантаження...
            </div>
        )
    }

    if (!currentCinema) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-zinc-500">
                <span className="text-5xl">🎬</span>
                <p>Кінотеатр не знайдено</p>
                <Link to="/cinemas" className="text-red-400 hover:underline text-sm">← До списку кінотеатрів</Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen text-white">

            <Breadcrumbs/>


            {/* ── Hero ─────────────────────────────────────────────────── */}
            <div className="relative mx-auto mt-6 rounded-2xl overflow-hidden h-64" style={{ maxWidth: '90%' }}>
                <img
                    src="https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&q=80"
                    alt={currentCinema.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/30 to-transparent" />
                <button className="absolute bottom-5 right-6 flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/25 text-white text-sm hover:bg-white/20 transition-colors">
                    📞 Контакт-центр
                </button>
                <div className="absolute bottom-7 left-8 text-white">
                    <p className="text-[11px] tracking-[0.15em] uppercase opacity-70 mb-1.5">
                        Кінотеатр Multiplex у місті {currentCinema.city}
                    </p>
                    <h1 className="text-4xl font-extrabold tracking-tight leading-none">{currentCinema.name}</h1>
                    <p className="mt-2.5 text-sm opacity-85 flex items-center gap-1.5">
                        📍 {currentCinema.address}, {currentCinema.city}
                    </p>
                </div>
            </div>

            {/* ── Контент ──────────────────────────────────────────────── */}
            <div className="mx-auto pb-20 space-y-6 mt-6" style={{ maxWidth: '90%' }}>

                {/* ── Дата-табы ─────────────────────────────────────────── */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {dateTabs.map((tab, i) => {
                        const isActive = selectedDate === tab.key
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setSelectedDate(tab.key)}
                                className="shrink-0 flex flex-col items-center px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150"
                                style={{
                                    background: isActive ? '#dc2626' : 'rgba(255,255,255,0.04)',
                                    borderColor: isActive ? '#dc2626' : 'rgba(255,255,255,0.1)',
                                    color: isActive ? '#fff' : '#9ca3af',
                                }}
                            >
                                <span className="text-[10px] uppercase tracking-wider opacity-70">
                                    {i === 0 ? 'Сьогодні' : i === 1 ? 'Завтра' : tab.dayName}
                                </span>
                                <span className="font-bold">{tab.label}</span>
                            </button>
                        )
                    })}
                </div>

                {/* ── Фильтр форматов ───────────────────────────────────── */}
                {allFormats.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-zinc-500 uppercase tracking-wider mr-1">Формати:</span>
                        {['ALL', ...allFormats].map(fmt => {
                            const active = selectedFormat === fmt
                            const color = fmt === 'ALL' ? '#e63535' : fmtColor(fmt)
                            return (
                                <button
                                    key={fmt}
                                    onClick={() => setSelectedFormat(fmt)}
                                    className="px-3 py-1 rounded-lg border text-xs font-semibold transition-all duration-150"
                                    style={{
                                        background: active ? color : `${color}11`,
                                        borderColor: active ? color : `${color}44`,
                                        color: active ? '#fff' : color,
                                    }}
                                >
                                    {fmt === 'ALL' ? 'ВСІ' : fmt}
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Подсказка */}
                <p className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>👆</span>
                    Натисніть на час сеансу, щоб обрати місця.
                    <span className="inline-flex items-center gap-1 ml-2 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px]">
                        <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                        ✦ — інший кінотеатр у м. {currentCinema.city}
                    </span>
                </p>

                {/* ── Фильмы и сеансы ───────────────────────────────────── */}
                {allSessionsByMovie.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
                        <span className="text-5xl">🎬</span>
                        <p className="text-sm">Немає сеансів у цьому місті на цю дату</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {allSessionsByMovie.map(({ movieId, movieTitle, sessions }) => (
                            <div
                                key={movieId}
                                className="p-4 rounded-2xl border border-white/5 bg-white/[0.03] hover:border-white/10 transition-colors"
                            >
                                <MovieRow
                                    movieId={movieId}
                                    movieTitle={movieTitle}
                                    sessions={sessions}
                                    currentCinemaId={currentCinema.id}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Зали ─────────────────────────────────────────────── */}
                {currentCinema.halls && currentCinema.halls.length > 0 && (
                    <section className="pt-8 space-y-5">
                        <SectionTitle>Зали кінотеатру {currentCinema.name}</SectionTitle>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                            {currentCinema.halls.map(hall => {
                                const rows = hall.seats.reduce((max, s) => Math.max(max, s.row), 0)
                                const cols = hall.seats.reduce((max, s) => Math.max(max, s.seat), 0)
                                const categories = Array.from(new Set(hall.seats.map(s => s.category)))

                                const CATEGORY_COLORS: Record<string, string> = {
                                    STANDARD:  '#4b5563',
                                    LUX:       '#2563eb',
                                    SUPER_LUX: '#7c3aed',
                                    CHILL_OUT: '#0891b2',
                                    VIP:       '#b45309',
                                }
                                const CATEGORY_LABELS: Record<string, string> = {
                                    STANDARD:  'Стандарт',
                                    LUX:       'Люкс',
                                    SUPER_LUX: 'Супер Люкс',
                                    CHILL_OUT: 'Chill Out',
                                    VIP:       'VIP',
                                }

                                return (
                                    <div
                                        key={hall.id}
                                        className="p-4 rounded-2xl border border-white/10 bg-white/5 hover:border-white/20 transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <p className="font-semibold text-sm">{hall.name}</p>
                                                <span
                                                    className="inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full border"
                                                    style={{
                                                        background: `${fmtColor(hall.format)}18`,
                                                        borderColor: `${fmtColor(hall.format)}44`,
                                                        color: fmtColor(hall.format),
                                                    }}
                                                >
                                                    {hall.format}
                                                </span>
                                            </div>
                                            <span className="text-xs text-zinc-500">{hall.seats.length} місць</span>
                                        </div>

                                        {/* Мини-карта зала */}
                                        <div className="rounded-lg overflow-hidden mb-3 border border-white/5" style={{ height: 56 }}>
                                            <div className="flex flex-col h-full gap-px p-1">
                                                {Array.from({ length: rows }, (_, i) => i + 1).map(row => (
                                                    <div key={row} className="flex flex-1 gap-px">
                                                        {Array.from({ length: cols }, (_, j) => j + 1).map(seatNum => {
                                                            const s = hall.seats.find(s => s.row === row && s.seat === seatNum)
                                                            return (
                                                                <div
                                                                    key={seatNum}
                                                                    className="flex-1 rounded-sm"
                                                                    style={{
                                                                        background: s ? CATEGORY_COLORS[s.category] : 'transparent',
                                                                        opacity: s ? 0.7 : 0,
                                                                    }}
                                                                />
                                                            )
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Категории */}
                                        <div className="flex flex-wrap gap-1">
                                            {categories.map(cat => {
                                                const price = hall.seats.find(s => s.category === cat)?.price ?? 0
                                                return (
                                                    <span
                                                        key={cat}
                                                        className="text-[10px] px-2 py-0.5 rounded-full border"
                                                        style={{
                                                            background: `${CATEGORY_COLORS[cat]}22`,
                                                            borderColor: `${CATEGORY_COLORS[cat]}44`,
                                                            color: CATEGORY_COLORS[cat],
                                                        }}
                                                    >
                                                        {CATEGORY_LABELS[cat]} · {price}₴
                                                    </span>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* ── Карта ─────────────────────────────────────────────── */}
                <section className="pt-8 space-y-5">
                    <SectionTitle>Як нас знайти</SectionTitle>
                    <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
                        <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 340 }}>
                            <iframe
                                title="map"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(currentCinema.address + ', ' + currentCinema.city)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                width="100%"
                                height="100%"
                                style={{ border: 0, display: 'block' }}
                                allowFullScreen
                                loading="lazy"
                            />
                        </div>
                        <div className="flex flex-col gap-5 p-6 rounded-2xl border border-white/10 bg-white/5">
                            <div>
                                <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Адреса</p>
                                <p className="font-semibold">{currentCinema.address}</p>
                                <p className="text-zinc-400 text-sm">{currentCinema.city}</p>
                            </div>
                            {currentCinema.halls && (
                                <div>
                                    <p className="text-[11px] text-zinc-500 uppercase tracking-widest mb-1">Зали</p>
                                    <div className="flex flex-col gap-1.5">
                                        {currentCinema.halls.map(h => (
                                            <div key={h.id} className="flex justify-between text-sm">
                                                <span>{h.name}</span>
                                                <span className="text-zinc-500">{h.seats.length} місць</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* ── Lightbox ──────────────────────────────────────────────── */}
            {lightboxPhoto && (
                <div
                    onClick={() => setLightboxPhoto(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-zoom-out"
                >
                    <img src={lightboxPhoto} alt="" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" />
                    <button
                        onClick={() => setLightboxPhoto(null)}
                        className="absolute top-5 right-6 w-9 h-9 rounded-full bg-white/10 border-none text-white text-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                    >✕</button>
                </div>
            )}
        </div>
    )
}