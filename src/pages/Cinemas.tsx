import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import type { Cinema } from '../models/cinema.ts'
import Breadcrumbs from "../components/Breadcrumbs.tsx";

// ─── Координаты городов для SVG-карты ────────────────────────────────────────

const CITY_PINS: { city: string; x: number; y: number }[] = [
    { city: 'Київ',         x: 57, y: 35 },
    { city: 'Харків',       x: 76, y: 33 },
    { city: 'Дніпро',       x: 70, y: 52 },
    { city: 'Одеса',        x: 52, y: 72 },
    { city: 'Львів',        x: 18, y: 33 },
    { city: 'Запоріжжя',    x: 70, y: 62 },
    { city: 'Полтава',      x: 68, y: 40 },
    { city: 'Луцьк',        x: 19, y: 24 },
    { city: 'Ужгород',      x: 8,  y: 32 },
    { city: 'Черкаси',      x: 60, y: 47 },
    { city: 'Хмельницький', x: 33, y: 38 },
    { city: 'Чернігів',     x: 60, y: 22 },
    { city: 'Миколаїв',     x: 58, y: 68 },
    { city: 'Кривий Ріг',   x: 62, y: 58 },
    { city: 'Житомир',      x: 43, y: 33 },
]

// ─── SVG Карта ───────────────────────────────────────────────────────────────

function UkraineMap({
                        cinemas,
                        selectedCity,
                        onCityClick,
                    }: {
    cinemas: Cinema[]
    selectedCity: string
    onCityClick: (city: string) => void
}) {
    const countByCity: Record<string, number> = {}
    cinemas.forEach(c => {
        countByCity[c.city] = (countByCity[c.city] ?? 0) + 1
    })

    const pinsToShow = CITY_PINS.filter(p => countByCity[p.city] !== undefined)

    return (
        <div className="relative w-full max-w-2xl mx-auto">
            <svg viewBox="0 0 100 80" className="w-full block">
                <rect width="100" height="80" fill="#1a1a1a" rx="2" />
                <path
                    d="M8,32 L10,28 L15,25 L19,20 L25,18 L30,17 L35,15 L40,14 L43,16 L47,13 L52,12 L57,13 L60,10 L65,9 L70,11 L74,9 L80,12 L84,15 L88,18 L90,23 L92,28 L90,33 L88,38 L85,42 L83,47 L80,52 L76,58 L73,62 L70,65 L67,68 L63,72 L58,75 L53,76 L48,75 L44,73 L40,71 L36,70 L32,68 L28,66 L24,64 L20,60 L16,56 L12,52 L9,46 L8,40 Z"
                    fill="#2d2d2d"
                    stroke="#444"
                    strokeWidth="0.4"
                />
                <path
                    d="M56,68 L58,66 L62,65 L65,67 L63,70 L59,72 L56,70 Z"
                    fill="#252525"
                    stroke="#444"
                    strokeWidth="0.3"
                />
                {pinsToShow.map(pin => {
                    const count = countByCity[pin.city]
                    const isSelected = selectedCity === pin.city
                    return (
                        <g
                            key={pin.city}
                            className="cursor-pointer"
                            onClick={() => onCityClick(isSelected ? 'Всі міста' : pin.city)}
                        >
                            <circle cx={pin.x} cy={pin.y + 0.5} r={count > 1 ? 3.5 : 2.5} fill="rgba(0,0,0,0.4)" />
                            <circle
                                cx={pin.x}
                                cy={pin.y}
                                r={count > 1 ? 3.2 : 2.4}
                                fill={isSelected ? '#ff6b6b' : '#e63535'}
                                stroke="#fff"
                                strokeWidth="0.5"
                            />
                            {count > 1 && (
                                <text x={pin.x} y={pin.y + 0.8} textAnchor="middle" fontSize="2.4" fill="#fff" fontWeight="bold">
                                    {count}
                                </text>
                            )}
                            <text x={pin.x} y={pin.y - 4} textAnchor="middle" fontSize="2.2" fill="#ccc">
                                {pin.city}
                            </text>
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

// ─── Скелетон ────────────────────────────────────────────────────────────────

function SkeletonCard() {
    return (
        <div className="flex rounded-2xl overflow-hidden border border-white/10 bg-white/5 h-40 animate-pulse">
            <div className="w-48 shrink-0 bg-white/10" />
            <div className="flex-1 p-6 flex flex-col gap-3">
                <div className="h-5 w-2/5 rounded-lg bg-white/10" />
                <div className="h-3 w-3/5 rounded-lg bg-white/10" />
                <div className="h-3 w-1/4 rounded-lg bg-white/10" />
            </div>
        </div>
    )
}

// ─── Карточка кинотеатра ──────────────────────────────────────────────────────

function CinemaCard({ cinema }: { cinema: Cinema }) {
    const navigate = useNavigate()

    return (
        <div className="group flex rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-white/25 hover:shadow-xl transition-all duration-200">
            {/* Превью */}
            <div
                className="w-48 shrink-0 cursor-pointer overflow-hidden"
                onClick={() => navigate(`/cinema/${cinema.id}`)}
            >
                <div className="w-full h-full min-h-[160px] bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center text-5xl group-hover:scale-105 transition-transform duration-300">
                    🎬
                </div>
            </div>

            {/* Контент */}
            <div className="flex-1 min-w-0 p-6">
                {/* Заголовок */}
                <div className="flex items-center gap-3 mb-2">
                    <h3
                        className="text-xl font-bold tracking-tight cursor-pointer hover:underline"
                        onClick={() => navigate(`/cinema/${cinema.id}`)}
                    >
                        {cinema.name}
                    </h3>
                    <span className="px-3 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold shrink-0">
                        {cinema.city}
                    </span>
                </div>

                {/* Адрес */}
                <p className="text-sm text-zinc-400 mb-4">
                    📍 {cinema.address}
                </p>

                {/* Зали */}
                {cinema.halls.length > 0 && (
                    <div className="mb-4">
                        <p className="text-[11px] text-zinc-500 font-semibold uppercase tracking-wider mb-2">
                            Зали ({cinema.halls.length})
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {cinema.halls.map(hall => (
                                <span
                                    key={hall.id}
                                    className="px-2.5 py-1 rounded-md text-[11px] border border-white/10 bg-white/5 text-zinc-400"
                                >
                                    {hall.name} · {hall.format}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Кнопка */}
                <button
                    onClick={() => navigate(`/cinema/${cinema.id}`)}
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-sm font-semibold transition-colors duration-150"
                >
                    Дивитись розклад →
                </button>
            </div>
        </div>
    )
}

// ─── Основная страница ────────────────────────────────────────────────────────

export default function Cinemas() {
    const [cinemas, setCinemas]             = useState<Cinema[]>([])
    const [loading, setLoading]             = useState(true)
    const [error, setError]                 = useState<string | null>(null)
    const [selectedCity, setSelectedCity]   = useState('Всі міста')
    const [search, setSearch]               = useState('')

    // ── Завантаження з Firestore ───────────────────────────────────────────
    useEffect(() => {
        async function fetchCinemas() {
            try {
                setLoading(true)
                setError(null)
                const snapshot = await getDocs(collection(db, 'cinemas'))
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Cinema[]
                setCinemas(data)
            } catch (err) {
                console.error('Firestore error:', err)
                setError('Не вдалося завантажити кінотеатри. Перевірте підключення.')
            } finally {
                setLoading(false)
            }
        }
        fetchCinemas()
    }, [])

    // ── Динамічні міста з БД ───────────────────────────────────────────────
    const cities = useMemo(() => {
        const unique = Array.from(new Set(cinemas.map(c => c.city))).sort()
        return ['Всі міста', ...unique]
    }, [cinemas])

    // ── Фільтрація ─────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return cinemas.filter(c => {
            if (selectedCity !== 'Всі міста' && c.city !== selectedCity) return false
            if (search.trim()) {
                const q = search.toLowerCase()
                if (
                    !c.name.toLowerCase().includes(q) &&
                    !c.address.toLowerCase().includes(q) &&
                    !c.city.toLowerCase().includes(q)
                ) return false
            }
            return true
        })
    }, [cinemas, selectedCity, search])

    const hasFilters = selectedCity !== 'Всі міста' || search.trim() !== ''

    return (
        <div className="min-h-screen text-white">
            <Breadcrumbs />


            {/* ── Карта ──────────────────────────────────────────────────── */}
            <div className="bg-zinc-950 border-b border-white/5 py-8">
                <div className="max-w-2xl mx-auto px-6">
                    {!loading && (
                        <UkraineMap
                            cinemas={filtered}
                            selectedCity={selectedCity}
                            onCityClick={setSelectedCity}
                        />
                    )}
                    {loading && (
                        <div className="h-48 flex items-center justify-center text-zinc-600 text-sm">
                            Завантаження карти...
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 pb-20">

                {/* ── Фільтри ────────────────────────────────────────────── */}
                <div className="flex flex-wrap items-end gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 mb-6">

                    {/* Пошук */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Пошук
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
                            <input
                                type="text"
                                placeholder="Назва, адреса, місто..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-red-500/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Місто — береться з БД */}
                    <div>
                        <label className="block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                            Місто
                        </label>
                        <select
                            value={selectedCity}
                            onChange={e => setSelectedCity(e.target.value)}
                            className={`px-4 py-2 rounded-lg border text-sm font-semibold cursor-pointer outline-none transition-colors
                                ${selectedCity !== 'Всі міста'
                                ? 'bg-red-600 border-red-500 text-white'
                                : 'bg-white/5 border-white/10 text-zinc-300'
                            }`}
                        >
                            {cities.map(c => (
                                <option key={c} value={c} className="bg-zinc-900 text-white">
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* ── Лічильник + скидання ───────────────────────────────── */}
                <div className="flex items-center gap-3 mb-5">
                    <h2 className="text-lg font-bold tracking-tight">
                        Кінотеатри
                        <span className="ml-2 text-sm font-normal text-zinc-500">
                            {loading ? '...' : filtered.length}
                        </span>
                    </h2>

                    {hasFilters && !loading && (
                        <button
                            onClick={() => { setSelectedCity('Всі міста'); setSearch('') }}
                            className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-zinc-400 text-xs hover:bg-white/10 transition-colors cursor-pointer"
                        >
                            ✕ Скинути фільтри
                        </button>
                    )}
                </div>

                {/* ── Список / скелетон / пусто / помилка ────────────────── */}
                {error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-4">
                        <span className="text-5xl">⚠️</span>
                        <p className="text-sm">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                        >
                            Спробувати знову
                        </button>
                    </div>
                ) : loading ? (
                    <div className="flex flex-col gap-4">
                        {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
                        <span className="text-5xl">🎬</span>
                        <p className="text-sm">Жодного кінотеатру не знайдено за вибраними фільтрами</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {filtered.map(c => <CinemaCard key={c.id} cinema={c} />)}
                    </div>
                )}
            </div>
        </div>
    )
}