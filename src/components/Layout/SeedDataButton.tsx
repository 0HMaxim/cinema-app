import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.ts'
import { useApp } from '../../context/AppContext.tsx'
import type { Cinema, Session } from '../../models/cinema.ts'
import type { ConcessionItem } from '../../models/order.ts'
import { X, Search, MapPin, Check, ChevronRight, Loader2 } from 'lucide-react'
import type { Seat, SeatCategory } from '../../models/seat.ts'
import type { Hall } from '../../models/hall.ts'

const TMDB_TOKEN    = import.meta.env.VITE_TMDB_TOKEN
const GEONAMES_USER = import.meta.env.VITE_GEONAMES_USER

// ─── Config ──────────────────────────────────────────────────────────────────

const CATEGORY_PRICES: Record<SeatCategory, number> = {
    STANDARD: 150, LUX: 220, SUPER_LUX: 310, CHILL_OUT: 280, VIP: 450,
}
const FORMATS = ['IMAX L 2D', 'SDH', 'ATMOS LUX', 'LUX SDH', 'Dolby Atmos']
const MIN_GAP           = 5
const DAY_START         = 9 * 60
const DAY_END           = 24 * 60
const SESSIONS_PER_HALL = 5
const MAX_ATTEMPTS      = 40
const DAYS_AHEAD        = 7
const NOW_PLAYING_PAGES = 3
const MAX_DAYS_RELEASE  = 60
const MOVIE_POOL        = 30
const CINEMAS_PER_CITY  = 4
const COUNTRY_TRANSLATE_BATCH = 20 // сколько стран переводим за раз (лениво)
const CITIES_PAGE_SIZE = 30 // сколько городов грузим за раз

const CONCESSIONS: Omit<ConcessionItem, 'id'>[] = [
    { name: 'Попкорн солодкий (M)', price: 95,  image: '🍿', quantity: 0 },
    { name: 'Попкорн солоний (L)',  price: 120, image: '🍿', quantity: 0 },
    { name: 'Кола 0.5л',           price: 55,  image: '🥤', quantity: 0 },
    { name: 'Начос із сиром',      price: 110, image: '🧀', quantity: 0 },
    { name: 'Хот-дог',             price: 85,  image: '🌭', quantity: 0 },
    { name: 'Вода 0.5л',           price: 35,  image: '💧', quantity: 0 },
    { name: 'Морозиво',            price: 65,  image: '🍦', quantity: 0 },
    { name: "M&M's",               price: 70,  image: '🍬', quantity: 0 },
]

const CINEMA_SUFFIXES = [
    'City Center', 'Plaza', 'Grand', 'Luxe', 'Galaxy', 'Orbit',
    'Horizon', 'Premiere', 'Atmos', 'IMAX', 'Panorama', 'Nova', 'Stellar', 'Metro',
]
const STREETS = [
    'Main St, 1', 'Central Ave, 12', 'Broadway, 45', 'Park Blvd, 7',
    'Cinema Rd, 22', 'Victory St, 3', 'Republic Ave, 18', 'Star Lane, 9',
]

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeoCity {
    geonameId: number
    name: string
    population: number
    countryCode: string
    namesUk?: string
    namesRu?: string
}

interface GeoCountry {
    geonameId: number
    code: string
    nameEn: string
    nameUk?: string
    nameRu?: string
    population: number
}

interface MovieSeed { id: number; title: string; runtime: number }

type ModalStep = 'mode' | 'country' | 'cities' | 'delete' | 'seeding'
type SeedMode = 'add' | 'delete' | 'clear'

// ─── Seed step strings (dynamic, not in t()) ──────────────────────────────────

const SEED_STEPS = {
    uk: {
        step1: 'Завантаження фільмів з TMDB…',
        step2: (n: number) => `Знайдено ${n} фільмів. Очищення бази…`,
        step3: 'Створення кінотеатрів…',
        step4: 'Запис до Firestore…',
        step5: 'Запис товарів…',
        done:  (c: number, s: number) => `✅ ${c} кінотеатрів, ${s} сеансів`,
        error: 'Помилка. Дивись консоль.',
        noMovies: 'TMDB повернув 0 фільмів',
        population: (n: number) => `${(n / 1_000_000).toFixed(1)}M`,
        cities: (n: number) => `${n} міст`,
        modeTitle: 'Що зробити?',
        modeAdd: 'Додати міста',
        modeAddDesc: 'Додати нові кінотеатри, не чіпаючи існуючі',
        modeDelete: 'Видалити',
        modeDeleteDesc: 'Прибрати окремі міста або кінотеатри',
        modeClear: 'Очистити все',
        modeClearDesc: 'Видалити всі дані без винятку',
        clearConfirm: 'Точно видалити ВСІ кінотеатри, міста й товари? Це незворотньо.',
        clearConfirmBtn: 'Так, видалити все',
        loadingExisting: 'Завантаження поточних даних…',
        noExisting: 'Поки що немає збережених міст',
        deleteSelected: (n: number) => `Видалити (${n})`,
        deleting: 'Видалення…',
        deleted: (n: number) => `✅ Видалено: ${n}`,
        skippedDuplicates: (n: number) => `Пропущено дублікатів: ${n}`,
        addedCities: (n: number) => `Додано міст: ${n}`,
        clearedAll: '✅ Усі дані видалено',
    },
    en: {
        step1: 'Fetching movies from TMDB…',
        step2: (n: number) => `Found ${n} movies. Clearing DB…`,
        step3: 'Building cinemas…',
        step4: 'Writing to Firestore…',
        step5: 'Writing products…',
        done:  (c: number, s: number) => `✅ ${c} cinemas, ${s} sessions`,
        error: 'Error. Check console.',
        noMovies: 'TMDB returned 0 movies',
        population: (n: number) => `${(n / 1_000_000).toFixed(1)}M`,
        cities: (n: number) => `${n} cities`,
        modeTitle: 'What do you want to do?',
        modeAdd: 'Add cities',
        modeAddDesc: 'Add new cinemas without touching existing ones',
        modeDelete: 'Delete',
        modeDeleteDesc: 'Remove specific cities or cinemas',
        modeClear: 'Clear all',
        modeClearDesc: 'Delete all data, no exceptions',
        clearConfirm: 'Really delete ALL cinemas, cities and products? This cannot be undone.',
        clearConfirmBtn: 'Yes, delete everything',
        loadingExisting: 'Loading current data…',
        noExisting: 'No saved cities yet',
        deleteSelected: (n: number) => `Delete (${n})`,
        deleting: 'Deleting…',
        deleted: (n: number) => `✅ Deleted: ${n}`,
        skippedDuplicates: (n: number) => `Duplicates skipped: ${n}`,
        addedCities: (n: number) => `Cities added: ${n}`,
        clearedAll: '✅ All data cleared',
    },
    ru: {
        step1: 'Загрузка фильмов из TMDB…',
        step2: (n: number) => `Найдено ${n} фильмов. Очистка БД…`,
        step3: 'Создание кинотеатров…',
        step4: 'Запись в Firestore…',
        step5: 'Запись товаров…',
        done:  (c: number, s: number) => `✅ ${c} кинотеатров, ${s} сеансов`,
        error: 'Ошибка. Смотри консоль.',
        noMovies: 'TMDB вернул 0 фильмов',
        population: (n: number) => `${(n / 1_000_000).toFixed(1)}M`,
        cities: (n: number) => `${n} городов`,
        modeTitle: 'Что сделать?',
        modeAdd: 'Добавить города',
        modeAddDesc: 'Добавить новые кинотеатры, не трогая существующие',
        modeDelete: 'Удалить',
        modeDeleteDesc: 'Убрать отдельные города или кинотеатры',
        modeClear: 'Очистить всё',
        modeClearDesc: 'Удалить все данные без исключений',
        clearConfirm: 'Точно удалить ВСЕ кинотеатры, города и товары? Это необратимо.',
        clearConfirmBtn: 'Да, удалить всё',
        loadingExisting: 'Загрузка текущих данных…',
        noExisting: 'Пока нет сохранённых городов',
        deleteSelected: (n: number) => `Удалить (${n})`,
        deleting: 'Удаление…',
        deleted: (n: number) => `✅ Удалено: ${n}`,
        skippedDuplicates: (n: number) => `Пропущено дублей: ${n}`,
        addedCities: (n: number) => `Добавлено городов: ${n}`,
        clearedAll: '✅ Все данные удалены',
    },
}

// ─── Flags ───────────────────────────────────────────────────────────────────

// ISO 3166-1 alpha-2 → flag emoji, чистая функция, без сети
function codeToFlagEmoji(code: string): string {
    if (!code || code.length !== 2) return '🌍'
    const A = 0x1f1e6
    const chars = code.toUpperCase().split('').map(c => A + (c.charCodeAt(0) - 65))
    if (chars.some(c => c < A || c > A + 25)) return '🌍'
    return String.fromCodePoint(...chars)
}

// ─── GeoNames ────────────────────────────────────────────────────────────────

async function fetchAllCountries(): Promise<GeoCountry[]> {
    const url = `https://secure.geonames.org/countryInfoJSON?username=${GEONAMES_USER}`
    const data = await fetch(url).then(r => r.json())
    const raw: any[] = data.geonames ?? []
    return raw
        .filter(c => c.geonameId && c.countryCode)
        .map(c => ({
            geonameId: c.geonameId,
            code: c.countryCode,
            nameEn: c.countryName ?? c.countryCode,
            population: Number(c.population) || 0,
        }))
        .sort((a, b) => b.population - a.population)
}

async function fetchPlaceTranslations(geonameId: number): Promise<{ uk?: string; ru?: string }> {
    try {
        const data = await fetch(
            `https://secure.geonames.org/getJSON?geonameId=${geonameId}&username=${GEONAMES_USER}`
        ).then(r => r.json())
        const alt: { lang: string; name: string }[] = data.alternateNames ?? []
        return {
            uk: alt.find(a => a.lang === 'uk')?.name,
            ru: alt.find(a => a.lang === 'ru')?.name,
        }
    } catch { return {} }
}

async function fetchCitiesPage(countryCode: string, startRow: number, excludeIds: Set<number>): Promise<{ cities: GeoCity[]; hasMore: boolean }> {
    const url = `https://secure.geonames.org/searchJSON?country=${countryCode}&featureClass=P&featureCode=PPLC&featureCode=PPLA&featureCode=PPLA2&featureCode=PPLA3&orderby=population&maxRows=${CITIES_PAGE_SIZE}&startRow=${startRow}&username=${GEONAMES_USER}`
    const data = await fetch(url).then(r => r.json())
    const raw: any[] = data.geonames ?? []
    const totalCount = Number(data.totalResultsCount) || 0
    const seen = new Map<string, any>()
    for (const c of raw) {
        if (excludeIds.has(c.geonameId)) continue
        if (!seen.has(c.name) || c.population > seen.get(c.name).population)
            seen.set(c.name, c)
    }
    const cities = Array.from(seen.values())
        .filter(c => c.population > 0)
        .sort((a, b) => b.population - a.population)
        .map(c => ({ geonameId: c.geonameId, name: c.name, population: c.population, countryCode }))
    return { cities, hasMore: startRow + CITIES_PAGE_SIZE < totalCount }
}

async function searchCitiesInCountry(countryCode: string, query: string): Promise<GeoCity[]> {
    const url = `https://secure.geonames.org/searchJSON?country=${countryCode}&featureClass=P&name_startsWith=${encodeURIComponent(query)}&orderby=population&maxRows=30&username=${GEONAMES_USER}`
    const data = await fetch(url).then(r => r.json())
    const raw: any[] = data.geonames ?? []
    const seen = new Map<string, any>()
    for (const c of raw) {
        if (!seen.has(c.name) || c.population > seen.get(c.name).population)
            seen.set(c.name, c)
    }
    return Array.from(seen.values())
        .sort((a, b) => b.population - a.population)
        .map(c => ({ geonameId: c.geonameId, name: c.name, population: c.population, countryCode }))
}

async function fetchCityTranslations(city: GeoCity): Promise<GeoCity> {
    const tr = await fetchPlaceTranslations(city.geonameId)
    return { ...city, namesUk: tr.uk, namesRu: tr.ru }
}

// ─── Builders ────────────────────────────────────────────────────────────────

function generateSeats(rows: number, cols: number): Seat[] {
    const seats: Seat[] = []
    for (let r = 1; r <= rows; r++) {
        for (let s = 1; s <= cols; s++) {
            let category: SeatCategory = 'STANDARD'
            if (r === rows)           category = 'VIP'
            else if (r === rows - 1)  category = 'SUPER_LUX'
            else if (r >= rows - 3)   category = 'LUX'
            else if (s <= 2 || s >= cols - 1) category = 'CHILL_OUT'
            seats.push({ row: r, seat: s, category, price: CATEGORY_PRICES[category] })
        }
    }
    return seats
}

function buildHalls(): Hall[] {
    return [
        { id: crypto.randomUUID(), name: 'Hall 1 IMAX',  format: FORMATS[0], seats: generateSeats(10, 16) },
        { id: crypto.randomUUID(), name: 'Hall 2 SDH',   format: FORMATS[1], seats: generateSeats(8, 14)  },
        { id: crypto.randomUUID(), name: 'Hall 3 ATMOS', format: FORMATS[2], seats: generateSeats(7, 12)  },
        { id: crypto.randomUUID(), name: 'Hall 4 VIP',   format: FORMATS[3], seats: generateSeats(5, 8)   },
    ]
}

function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function minsToTime(m: number) {
    return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

function buildSessionsForHall(hall: Hall, movies: MovieSeed[], date: string): Session[] {
    const occupied: { start: number; end: number }[] = []
    const sessions: Session[] = []
    let attempts = 0
    while (sessions.length < SESSIONS_PER_HALL && attempts < SESSIONS_PER_HALL * MAX_ATTEMPTS) {
        attempts++
        const movie = movies[randInt(0, movies.length - 1)]
        const latest = DAY_END - movie.runtime
        if (latest < DAY_START) continue
        const start = randInt(DAY_START, latest)
        const end = start + movie.runtime
        if (occupied.some(o => start < o.end + MIN_GAP && end > o.start - MIN_GAP)) continue
        occupied.push({ start, end })
        sessions.push({
            id: crypto.randomUUID(),
            movieId: movie.id, movieTitle: movie.title,
            hallId: hall.id, date,
            time: minsToTime(start),
            format: hall.format,
            bookedSeats: [],
            durationMinutes: movie.runtime,
        } as Session)
    }
    return sessions.sort((a, b) => a.time.localeCompare(b.time))
}

function buildCinemasForCities(cities: GeoCity[], movies: MovieSeed[]): { cinemas: Cinema[]; cityDocs: any[] } {
    const cinemas: Cinema[] = []
    const cityDocs: any[] = []
    const dates = Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10)
    })
    cities.forEach(city => {
        const cityKey = city.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        cityDocs.push({
            key: cityKey,
            names: { en: city.name, uk: city.namesUk ?? city.name, ru: city.namesRu ?? city.name },
        })
        const shuffled = [...CINEMA_SUFFIXES].sort(() => Math.random() - 0.5)
        for (let i = 0; i < CINEMAS_PER_CITY; i++) {
            const halls = buildHalls()
            const sessions: Session[] = []
            const movieSlice = movies.slice((i * 8) % movies.length).concat(movies).slice(0, 12)
            for (const date of dates) for (const hall of halls) sessions.push(...buildSessionsForHall(hall, movieSlice, date))
            cinemas.push({
                id: crypto.randomUUID(),
                name: `CineMax ${shuffled[i] ?? 'Cinema'}`,
                city: city.namesUk ?? city.name,
                cityKey,
                address: STREETS[i % STREETS.length],
                halls, sessions,
            })
        }
    })
    return { cinemas, cityDocs }
}

// ─── TMDB ────────────────────────────────────────────────────────────────────

function isInTheaters(releaseDate?: string): boolean {
    if (!releaseDate) return false
    const days = (Date.now() - new Date(releaseDate).getTime()) / 86_400_000
    return days >= 0 && days <= MAX_DAYS_RELEASE
}

async function fetchMovies(lang: string): Promise<MovieSeed[]> {
    const tmdbLang = lang === 'uk' ? 'uk-UA' : lang === 'ru' ? 'ru-RU' : 'en-US'
    const headers = { Authorization: `Bearer ${TMDB_TOKEN}` }
    const pages = await Promise.all(
        Array.from({ length: NOW_PLAYING_PAGES }, (_, i) =>
            fetch(`https://api.themoviedb.org/3/movie/now_playing?language=${tmdbLang}&page=${i + 1}`, { headers })
                .then(r => r.json()).catch(() => ({ results: [] }))
        )
    )
    const unique = Array.from(
        new Map(pages.flatMap(p => p.results ?? []).map((m: any) => [m.id, m])).values()
    ).filter((m: any) => isInTheaters(m.release_date)).slice(0, MOVIE_POOL)
    return Promise.all(unique.map(async (m: any) => {
        try {
            const d = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?language=${tmdbLang}`, { headers }).then(r => r.json())
            return { id: m.id, title: m.title, runtime: d.runtime > 60 ? d.runtime : 110 }
        } catch { return { id: m.id, title: m.title, runtime: 110 } }
    }))
}

async function clearCollection(name: string) {
    const snap = await getDocs(collection(db, name))
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, name, d.id))))
}

interface ExistingCity { docId: string; key: string; nameEn: string; nameUk: string; nameRu: string }
interface ExistingCinema { docId: string; name: string; cityKey: string; city: string }

async function fetchExistingCities(): Promise<ExistingCity[]> {
    const snap = await getDocs(collection(db, 'cities'))
    return snap.docs.map(d => {
        const data = d.data() as any
        return {
            docId: d.id,
            key: data.key ?? '',
            nameEn: data.names?.en ?? data.key ?? '?',
            nameUk: data.names?.uk ?? data.names?.en ?? data.key ?? '?',
            nameRu: data.names?.ru ?? data.names?.en ?? data.key ?? '?',
        }
    })
}

async function fetchExistingCinemas(): Promise<ExistingCinema[]> {
    const snap = await getDocs(collection(db, 'cinemas'))
    return snap.docs.map(d => {
        const data = d.data() as any
        return { docId: d.id, name: data.name ?? '?', cityKey: data.cityKey ?? '', city: data.city ?? '?' }
    })
}

async function deleteDocsByIds(collectionName: string, ids: string[]) {
    await Promise.all(ids.map(id => deleteDoc(doc(db, collectionName, id))))
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SeedDataButton() {
    const { lang, t } = useApp()
    const steps = SEED_STEPS[lang] ?? SEED_STEPS.uk

    const [modalOpen,       setModalOpen]       = useState(false)
    const [step,            setStep]            = useState<ModalStep>('mode')
    const [mode,             setMode]            = useState<SeedMode | null>(null)
    const [allCountries,    setAllCountries]    = useState<GeoCountry[]>([])
    const [countriesLoading,setCountriesLoading]= useState(false)
    const [countries,       setCountries]       = useState<GeoCountry[]>([])
    const [countryQuery,    setCountryQuery]    = useState('')
    const [selectedCountry, setSelectedCountry] = useState<GeoCountry | null>(null)
    const [cities,          setCities]          = useState<GeoCity[]>([])
    const [citiesLoading,   setCitiesLoading]   = useState(false)
    const [citiesLoadingMore, setCitiesLoadingMore] = useState(false)
    const [citiesHasMore,   setCitiesHasMore]   = useState(false)
    const [cityQuery,       setCityQuery]       = useState('')
    const [citySearchResults, setCitySearchResults] = useState<GeoCity[] | null>(null) // null = режим обычного списка, массив = режим поиска
    const [citySearching,   setCitySearching]   = useState(false)
    const [selectedCityIds, setSelectedCityIds] = useState<Set<number>>(new Set())
    const [seedStatus,      setSeedStatus]      = useState('')
    const [seedDone,        setSeedDone]        = useState('')

    // ── Delete mode state ──
    const [existingCities,   setExistingCities]   = useState<ExistingCity[]>([])
    const [existingCinemas,  setExistingCinemas]  = useState<ExistingCinema[]>([])
    const [existingLoading,  setExistingLoading]  = useState(false)
    const [selectedCityDocIds, setSelectedCityDocIds] = useState<Set<string>>(new Set())
    const [deleting,         setDeleting]         = useState(false)
    const [deleteDone,       setDeleteDone]       = useState('')
    const [clearConfirming,  setClearConfirming]  = useState(false)

    // Подтягивает переводы uk/ru для стран, у которых их ещё нет (лениво, батчем)
    const ensureCountryTranslations = (list: GeoCountry[]) => {
        const need = list.filter(c => c.nameUk === undefined && c.nameRu === undefined).slice(0, COUNTRY_TRANSLATE_BATCH)
        if (!need.length) return
        Promise.all(need.map(async c => ({ geonameId: c.geonameId, ...(await fetchPlaceTranslations(c.geonameId)) })))
            .then(results => {
                const byId = new Map(results.map(r => [r.geonameId, r]))
                const patch = (arr: GeoCountry[]) => arr.map(c => {
                    const r = byId.get(c.geonameId)
                    return r ? { ...c, nameUk: r.uk ?? c.nameEn, nameRu: r.ru ?? c.nameEn } : c
                })
                setAllCountries(prev => patch(prev))
                setCountries(prev => patch(prev))
            })
            .catch(() => {})
    }

    useEffect(() => {
        setCountriesLoading(true)
        fetchAllCountries()
            .then(list => {
                setAllCountries(list)
                const visible = list.slice(0, 20)
                setCountries(visible)
                ensureCountryTranslations(visible)
            })
            .catch(err => console.error('countries fetch failed:', err))
            .finally(() => setCountriesLoading(false))
    }, [])

    // Серверный поиск городов по всей стране, с debounce
    useEffect(() => {
        if (!selectedCountry || step !== 'cities') return
        const q = cityQuery.trim()
        if (!q) { setCitySearchResults(null); setCitySearching(false); return }
        setCitySearching(true)
        const handle = setTimeout(() => {
            searchCitiesInCountry(selectedCountry.code, q)
                .then(async raw => {
                    const withTr = await Promise.all(raw.map(fetchCityTranslations))
                    setCitySearchResults(withTr)
                    // мерджим найденные города в основной список, чтобы выбор сохранялся и попадал в handleSeed
                    setCities(prev => {
                        const known = new Set(prev.map(c => c.geonameId))
                        const fresh = withTr.filter(c => !known.has(c.geonameId))
                        return fresh.length ? [...prev, ...fresh] : prev
                    })
                })
                .catch(() => setCitySearchResults([]))
                .finally(() => setCitySearching(false))
        }, 400)
        return () => clearTimeout(handle)
    }, [cityQuery, selectedCountry, step])

    const handleCountrySearch = (q: string) => {
        setCountryQuery(q)
        const src = q.trim()
            ? allCountries.filter(c => {
                const lower = q.toLowerCase()
                return c.nameEn.toLowerCase().includes(lower)
                    || (c.nameUk ?? '').toLowerCase().includes(lower)
                    || (c.nameRu ?? '').toLowerCase().includes(lower)
                    || c.code.toLowerCase() === lower
            }).slice(0, 15)
            : allCountries.slice(0, 20)
        setCountries(src)
        ensureCountryTranslations(src)
    }

    const handleSelectCountry = async (country: GeoCountry) => {
        setSelectedCountry(country)
        setStep('cities')
        setCitiesLoading(true)
        setCities([])
        setCityQuery('')
        setCitySearchResults(null)
        setCitiesHasMore(false)
        setSelectedCityIds(new Set())
        const { cities: raw, hasMore } = await fetchCitiesPage(country.code, 0, new Set())
        const withTr = await Promise.all(raw.map(fetchCityTranslations))
        setCities(withTr)
        setCitiesHasMore(hasMore)
        setSelectedCityIds(new Set(withTr.slice(0, 5).map(c => c.geonameId)))
        setCitiesLoading(false)
    }

    const loadMoreCities = async () => {
        if (!selectedCountry || citiesLoadingMore) return
        setCitiesLoadingMore(true)
        try {
            const excludeIds = new Set(cities.map(c => c.geonameId))
            const { cities: raw, hasMore } = await fetchCitiesPage(selectedCountry.code, cities.length, excludeIds)
            const withTr = await Promise.all(raw.map(fetchCityTranslations))
            setCities(prev => [...prev, ...withTr])
            setCitiesHasMore(hasMore)
        } finally {
            setCitiesLoadingMore(false)
        }
    }

    const toggleCity = (id: number) => {
        setSelectedCityIds(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    const handleSeed = async () => {
        const chosen = cities.filter(c => selectedCityIds.has(c.geonameId))
        if (!chosen.length) return
        setStep('seeding')
        setSeedDone('')
        try {
            // проверяем дубликаты по cityKey среди уже существующих городов
            const existing = await fetchExistingCities()
            const existingKeys = new Set(existing.map(c => c.key))
            const toCityKey = (name: string) => name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
            const newChosen = chosen.filter(c => !existingKeys.has(toCityKey(c.name)))
            const skipped = chosen.length - newChosen.length
            if (!newChosen.length) {
                setSeedStatus('')
                setSeedDone(steps.skippedDuplicates(skipped))
                return
            }

            setSeedStatus(steps.step1)
            const movies = await fetchMovies(lang)
            if (!movies.length) throw new Error(steps.noMovies)
            setSeedStatus(steps.step2(movies.length))

            // не чистим коллекции — только убеждаемся, что concessions есть (пишем, если пусто)
            const concessionsSnap = await getDocs(collection(db, 'concessions'))
            if (concessionsSnap.empty) {
                await Promise.all(CONCESSIONS.map(item => {
                    const id = crypto.randomUUID()
                    return setDoc(doc(db, 'concessions', id), { id, ...item })
                }))
            }

            setSeedStatus(steps.step3)
            const { cinemas, cityDocs } = buildCinemasForCities(newChosen, movies)
            setSeedStatus(steps.step4)
            await Promise.all([
                ...cityDocs.map(cd => { const id = crypto.randomUUID(); return setDoc(doc(db, 'cities', id), cd) }),
                ...cinemas.map(c => setDoc(doc(db, 'cinemas', c.id), c)),
            ])
            const totalSessions = cinemas.reduce((sum, c) => sum + c.sessions.length, 0)
            setSeedStatus('')
            const doneMsg = steps.done(cinemas.length, totalSessions)
            setSeedDone(skipped > 0 ? `${doneMsg} · ${steps.skippedDuplicates(skipped)}` : doneMsg)
        } catch (err) {
            console.error(err)
            setSeedStatus('')
            setSeedDone(steps.error)
        }
    }

    const handleOpen = () => {
        setModalOpen(true)
        setStep('mode')
        setMode(null)
        setCountryQuery('')
        const visible = allCountries.slice(0, 20)
        setCountries(visible)
        ensureCountryTranslations(visible)
        setSelectedCountry(null)
        setCities([])
        setSelectedCityIds(new Set())
        setSeedStatus('')
        setSeedDone('')
        setExistingCities([])
        setExistingCinemas([])
        setSelectedCityDocIds(new Set())
        setDeleteDone('')
        setClearConfirming(false)
    }

    const handleSelectMode = async (m: SeedMode) => {
        setMode(m)
        if (m === 'add') {
            setStep('country')
            return
        }
        if (m === 'clear') {
            setStep('delete') // переиспользуем экран delete для подтверждения очистки
            setClearConfirming(true)
            return
        }
        // m === 'delete'
        setStep('delete')
        setClearConfirming(false)
        setExistingLoading(true)
        try {
            const [c, k] = await Promise.all([fetchExistingCities(), fetchExistingCinemas()])
            setExistingCities(c)
            setExistingCinemas(k)
        } catch (err) {
            console.error(err)
        } finally {
            setExistingLoading(false)
        }
    }

    const toggleCityDocSelection = (docId: string) => {
        setSelectedCityDocIds(prev => {
            const next = new Set(prev)
            next.has(docId) ? next.delete(docId) : next.add(docId)
            return next
        })
    }

    const handleDeleteSelected = async () => {
        if (!selectedCityDocIds.size) return
        setDeleting(true)
        setDeleteDone('')
        try {
            const cityIds = existingCities.filter(c => selectedCityDocIds.has(c.docId)).map(c => c.docId)
            const cityKeys = new Set(existingCities.filter(c => selectedCityDocIds.has(c.docId)).map(c => c.key))
            // удаляем сами города + все кинотеатры, привязанные к этим городам (по cityKey)
            const cinemaIdsToDelete = existingCinemas.filter(k => cityKeys.has(k.cityKey)).map(k => k.docId)
            await Promise.all([
                deleteDocsByIds('cities', cityIds),
                deleteDocsByIds('cinemas', cinemaIdsToDelete),
            ])
            const deletedCount = cityIds.length
            setExistingCities(prev => prev.filter(c => !selectedCityDocIds.has(c.docId)))
            setExistingCinemas(prev => prev.filter(k => !cityKeys.has(k.cityKey)))
            setSelectedCityDocIds(new Set())
            setDeleteDone(steps.deleted(deletedCount))
        } catch (err) {
            console.error(err)
            setDeleteDone(steps.error)
        } finally {
            setDeleting(false)
        }
    }

    const handleClearAll = async () => {
        setDeleting(true)
        setDeleteDone('')
        try {
            await Promise.all([clearCollection('cinemas'), clearCollection('concessions'), clearCollection('cities')])
            setExistingCities([])
            setExistingCinemas([])
            setSelectedCityDocIds(new Set())
            setClearConfirming(false)
            setDeleteDone(steps.clearedAll)
        } catch (err) {
            console.error(err)
            setDeleteDone(steps.error)
        } finally {
            setDeleting(false)
        }
    }

    const countryName = selectedCountry
        ? (lang === 'uk' ? (selectedCountry.nameUk ?? selectedCountry.nameEn)
            : lang === 'ru' ? (selectedCountry.nameRu ?? selectedCountry.nameEn)
                : selectedCountry.nameEn)
        : ''

    const allSelected = cities.length > 0 && selectedCityIds.size === cities.length

    const displayedCities = citySearchResults !== null ? citySearchResults : cities

    return (
        <>
            {/* Trigger */}
            <button
                onClick={handleOpen}
                className="h-9 px-3 rounded-xl border flex items-center gap-1.5 text-[0.8125rem] font-medium transition-colors"
                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
            >
                🌱
                <span className="hidden sm:inline">{t('seedButton')}</span>
            </button>

            {/* Backdrop */}
            {modalOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-20 pb-8"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
                    onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
                >
                    {/* Modal — pt-20 на backdrop даёт отступ от топа, modal сам не имеет margin */}
                    <div
                        className="w-full flex flex-col rounded-2xl border overflow-hidden"
                        style={{
                            maxWidth: '28rem',
                            maxHeight: '75vh',
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            boxShadow: '0 1.5rem 4rem rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Header */}
                        <div
                            className="shrink-0 flex items-center justify-between px-5 py-3 border-b"
                            style={{ borderColor: 'var(--border)' }}
                        >
                            <div className="flex items-center gap-2">
                                {(step === 'cities' || step === 'country' || step === 'delete') && (
                                    <button
                                        onClick={() => step === 'cities' ? setStep('country') : setStep('mode')}
                                        className="w-7 h-7 rounded-lg flex items-center justify-center border text-[0.875rem] transition-colors"
                                        style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                    >
                                        ←
                                    </button>
                                )}
                                <div>
                                    <p className="text-[0.625rem] uppercase tracking-widest font-semibold" style={{ color: 'var(--accent)' }}>
                                        Seed
                                    </p>
                                    <h2 className="text-[1rem] font-bold leading-tight" style={{ color: 'var(--fg)' }}>
                                        {step === 'mode'    && steps.modeTitle}
                                        {step === 'country' && t('seedChooseCountry')}
                                        {step === 'cities'  && `${t('seedCitiesOf')} — ${countryName}`}
                                        {step === 'delete'  && (clearConfirming ? steps.modeClear : steps.modeDelete)}
                                        {step === 'seeding' && '🌱 Seeding…'}
                                    </h2>
                                </div>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border transition-colors"
                                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                            >
                                <X size={13} />
                            </button>
                        </div>

                        {/* ── Mode ── */}
                        {step === 'mode' && (
                            <div className="flex flex-col gap-2 p-3 flex-1 overflow-y-auto min-h-0">
                                <button
                                    onClick={() => handleSelectMode('add')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                                >
                                    <span className="text-xl shrink-0">➕</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[0.875rem] font-semibold" style={{ color: 'var(--fg)' }}>
                                            {steps.modeAdd}
                                        </p>
                                        <p className="text-[0.6875rem]" style={{ color: 'var(--fg-muted)' }}>
                                            {steps.modeAddDesc}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} style={{ color: 'var(--fg-muted)' }} className="shrink-0" />
                                </button>

                                <button
                                    onClick={() => handleSelectMode('delete')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                                >
                                    <span className="text-xl shrink-0">🗑️</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[0.875rem] font-semibold" style={{ color: 'var(--fg)' }}>
                                            {steps.modeDelete}
                                        </p>
                                        <p className="text-[0.6875rem]" style={{ color: 'var(--fg-muted)' }}>
                                            {steps.modeDeleteDesc}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} style={{ color: 'var(--fg-muted)' }} className="shrink-0" />
                                </button>

                                <button
                                    onClick={() => handleSelectMode('clear')}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:opacity-80"
                                    style={{ background: 'color-mix(in srgb, #ef4444 8%, var(--surface-2))', borderColor: 'color-mix(in srgb, #ef4444 30%, var(--border))' }}
                                >
                                    <span className="text-xl shrink-0">⚠️</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[0.875rem] font-semibold" style={{ color: '#ef4444' }}>
                                            {steps.modeClear}
                                        </p>
                                        <p className="text-[0.6875rem]" style={{ color: 'var(--fg-muted)' }}>
                                            {steps.modeClearDesc}
                                        </p>
                                    </div>
                                    <ChevronRight size={14} style={{ color: '#ef4444' }} className="shrink-0" />
                                </button>
                            </div>
                        )}

                        {/* ── Country ── */}
                        {step === 'country' && (
                            <div className="flex flex-col gap-2 p-3 flex-1 overflow-hidden min-h-0">
                                <div
                                    className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border"
                                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                                >
                                    <Search size={14} style={{ color: 'var(--fg-muted)' }} className="shrink-0" />
                                    <input
                                        autoFocus
                                        value={countryQuery}
                                        onChange={e => handleCountrySearch(e.target.value)}
                                        placeholder={t('seedSearchCountry')}
                                        className="flex-1 bg-transparent outline-none text-[0.8125rem]"
                                        style={{ color: 'var(--fg)' }}
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto flex flex-col gap-1 min-h-0">
                                    {countriesLoading && countries.length === 0 && (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                        </div>
                                    )}
                                    {!countriesLoading && countries.length === 0 && (
                                        <p className="text-[0.75rem] text-center py-8" style={{ color: 'var(--fg-muted)' }}>
                                            {t('seedSearchCountry')}
                                        </p>
                                    )}
                                    {countries.map(country => {
                                        const name = lang === 'uk' ? (country.nameUk ?? country.nameEn)
                                            : lang === 'ru' ? (country.nameRu ?? country.nameEn)
                                                : country.nameEn
                                        const flag = codeToFlagEmoji(country.code)
                                        return (
                                            <button
                                                key={country.geonameId}
                                                onClick={() => handleSelectCountry(country)}
                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all hover:opacity-80"
                                                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                                            >
                                                <span className="text-lg shrink-0">{flag}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-[0.8125rem] font-semibold truncate" style={{ color: 'var(--fg)' }}>
                                                        {name}
                                                    </p>
                                                    <p className="text-[0.6875rem]" style={{ color: 'var(--fg-muted)' }}>
                                                        {country.nameEn} · {country.code}
                                                    </p>
                                                </div>
                                                <ChevronRight size={13} style={{ color: 'var(--fg-muted)' }} className="shrink-0" />
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ── Cities ── */}
                        {step === 'cities' && (
                            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                                {citiesLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                        <p className="text-[0.8125rem]" style={{ color: 'var(--fg-muted)' }}>
                                            {t('seedLoadingCities')}
                                        </p>
                                    </div>
                                ) : cities.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                                        <MapPin size={24} style={{ color: 'var(--fg-muted)' }} />
                                        <p className="text-[0.8125rem]" style={{ color: 'var(--fg-muted)' }}>
                                            {t('seedNoCities') ?? 'No cities found for this country'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="shrink-0 px-3 pt-3 pb-2 flex flex-col gap-2">
                                            <div
                                                className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                                                style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }}
                                            >
                                                <Search size={14} style={{ color: 'var(--fg-muted)' }} className="shrink-0" />
                                                <input
                                                    value={cityQuery}
                                                    onChange={e => setCityQuery(e.target.value)}
                                                    placeholder={t('seedSearchCity') ?? t('seedSearchCountry')}
                                                    className="flex-1 bg-transparent outline-none text-[0.8125rem]"
                                                    style={{ color: 'var(--fg)' }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between px-1">
                                                <p className="text-[0.6875rem]" style={{ color: 'var(--fg-muted)' }}>
                                                    {t('seedChooseCities')}
                                                </p>
                                                <button
                                                    onClick={() => setSelectedCityIds(
                                                        allSelected ? new Set() : new Set(cities.map(c => c.geonameId))
                                                    )}
                                                    className="text-[0.6875rem] font-medium transition-colors"
                                                    style={{ color: 'var(--accent)' }}
                                                >
                                                    {allSelected ? t('seedDeselectAll') : t('seedSelectAll')}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto px-3 pb-3 flex flex-col gap-1 min-h-0">
                                            {citySearching && (
                                                <div className="flex items-center justify-center gap-2 py-6">
                                                    <Loader2 size={16} className="animate-spin" style={{ color: 'var(--fg-muted)' }} />
                                                    <p className="text-[0.75rem]" style={{ color: 'var(--fg-muted)' }}>
                                                        {t('seedSearching') ?? 'Searching…'}
                                                    </p>
                                                </div>
                                            )}
                                            {!citySearching && displayedCities.length === 0 && (
                                                <p className="text-[0.75rem] text-center py-6" style={{ color: 'var(--fg-muted)' }}>
                                                    {t('seedNoCities') ?? 'No cities found'}
                                                </p>
                                            )}
                                            {!citySearching && displayedCities.map(city => {
                                                const isSelected = selectedCityIds.has(city.geonameId)
                                                const displayName = lang === 'uk' ? (city.namesUk ?? city.name)
                                                    : lang === 'ru' ? (city.namesRu ?? city.name)
                                                        : city.name
                                                return (
                                                    <button
                                                        key={city.geonameId}
                                                        onClick={() => toggleCity(city.geonameId)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all"
                                                        style={isSelected
                                                            ? { background: 'color-mix(in srgb, var(--accent) 10%, transparent)', borderColor: 'var(--accent)' }
                                                            : { background: 'var(--surface-2)', borderColor: 'var(--border)' }
                                                        }
                                                    >
                                                        <div
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{
                                                                background: isSelected
                                                                    ? 'color-mix(in srgb, var(--accent) 20%, transparent)'
                                                                    : 'var(--surface)',
                                                            }}
                                                        >
                                                            {isSelected
                                                                ? <Check size={13} style={{ color: 'var(--accent)' }} />
                                                                : <MapPin size={13} style={{ color: 'var(--fg-muted)' }} />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[0.8125rem] font-semibold truncate"
                                                               style={{ color: isSelected ? 'var(--accent)' : 'var(--fg)' }}>
                                                                {displayName}
                                                            </p>
                                                            {city.name !== displayName && (
                                                                <p className="text-[0.6875rem]" style={{ color: 'var(--fg-muted)' }}>
                                                                    {city.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <span className="text-[0.6875rem] shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                                            {steps.population(city.population)}
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                            {!citySearching && citySearchResults === null && citiesHasMore && (
                                                <button
                                                    onClick={loadMoreCities}
                                                    disabled={citiesLoadingMore}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-[0.75rem] font-medium transition-colors disabled:opacity-50"
                                                    style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--accent)' }}
                                                >
                                                    {citiesLoadingMore
                                                        ? <Loader2 size={13} className="animate-spin" />
                                                        : null}
                                                    {t('seedLoadMore') ?? 'Load more'}
                                                </button>
                                            )}
                                        </div>

                                        <div
                                            className="shrink-0 px-3 py-3 border-t flex gap-2"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            <button
                                                onClick={() => setModalOpen(false)}
                                                className="px-4 py-2 rounded-xl border text-[0.8125rem] transition-colors"
                                                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
                                            >
                                                {t('seedCancel')}
                                            </button>
                                            <button
                                                onClick={handleSeed}
                                                disabled={selectedCityIds.size === 0}
                                                className="flex-1 py-2 rounded-xl text-[0.8125rem] font-semibold transition-colors disabled:opacity-40"
                                                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                                            >
                                                {selectedCityIds.size === 0
                                                    ? t('seedMinCities')
                                                    : `${t('seedStartSeed')} (${steps.cities(selectedCityIds.size)})`
                                                }
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Delete / Clear ── */}
                        {step === 'delete' && (
                            <div className="flex flex-col flex-1 overflow-hidden min-h-0">
                                {clearConfirming ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                                        {!deleteDone ? (
                                            deleting ? (
                                                <>
                                                    <Loader2 size={32} className="animate-spin" style={{ color: '#ef4444' }} />
                                                    <p className="text-[0.8125rem]" style={{ color: 'var(--fg-muted)' }}>
                                                        {steps.deleting}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-3xl">⚠️</span>
                                                    <p className="text-[0.8125rem]" style={{ color: 'var(--fg)' }}>
                                                        {steps.clearConfirm}
                                                    </p>
                                                    <div className="flex gap-2 w-full mt-2">
                                                        <button
                                                            onClick={() => setStep('mode')}
                                                            className="flex-1 px-4 py-2 rounded-xl border text-[0.8125rem] transition-colors"
                                                            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
                                                        >
                                                            {t('seedCancel')}
                                                        </button>
                                                        <button
                                                            onClick={handleClearAll}
                                                            className="flex-1 px-4 py-2 rounded-xl text-[0.8125rem] font-semibold transition-colors"
                                                            style={{ background: '#ef4444', color: '#fff' }}
                                                        >
                                                            {steps.clearConfirmBtn}
                                                        </button>
                                                    </div>
                                                </>
                                            )
                                        ) : (
                                            <>
                                                <p className="text-2xl">✅</p>
                                                <p className="text-[0.875rem] font-medium" style={{ color: 'var(--fg)' }}>
                                                    {deleteDone}
                                                </p>
                                                <button
                                                    onClick={() => setModalOpen(false)}
                                                    className="mt-2 px-6 py-2 rounded-xl text-[0.875rem] font-semibold transition-colors"
                                                    style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                                                >
                                                    {t('seedClose')}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ) : existingLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                                        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                        <p className="text-[0.8125rem]" style={{ color: 'var(--fg-muted)' }}>
                                            {steps.loadingExisting}
                                        </p>
                                    </div>
                                ) : deleteDone ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                                        <p className="text-2xl">✅</p>
                                        <p className="text-[0.875rem] font-medium" style={{ color: 'var(--fg)' }}>
                                            {deleteDone}
                                        </p>
                                        <button
                                            onClick={() => setModalOpen(false)}
                                            className="mt-2 px-6 py-2 rounded-xl text-[0.875rem] font-semibold transition-colors"
                                            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                                        >
                                            {t('seedClose')}
                                        </button>
                                    </div>
                                ) : existingCities.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
                                        <MapPin size={24} style={{ color: 'var(--fg-muted)' }} />
                                        <p className="text-[0.8125rem]" style={{ color: 'var(--fg-muted)' }}>
                                            {steps.noExisting}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex-1 overflow-y-auto px-3 pt-3 pb-3 flex flex-col gap-1 min-h-0">
                                            {existingCities.map(city => {
                                                const isSelected = selectedCityDocIds.has(city.docId)
                                                const displayName = lang === 'uk' ? city.nameUk : lang === 'ru' ? city.nameRu : city.nameEn
                                                const cinemaCount = existingCinemas.filter(k => k.cityKey === city.key).length
                                                return (
                                                    <button
                                                        key={city.docId}
                                                        onClick={() => toggleCityDocSelection(city.docId)}
                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-all"
                                                        style={isSelected
                                                            ? { background: 'color-mix(in srgb, #ef4444 10%, transparent)', borderColor: '#ef4444' }
                                                            : { background: 'var(--surface-2)', borderColor: 'var(--border)' }
                                                        }
                                                    >
                                                        <div
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                            style={{
                                                                background: isSelected
                                                                    ? 'color-mix(in srgb, #ef4444 20%, transparent)'
                                                                    : 'var(--surface)',
                                                            }}
                                                        >
                                                            {isSelected
                                                                ? <Check size={13} style={{ color: '#ef4444' }} />
                                                                : <MapPin size={13} style={{ color: 'var(--fg-muted)' }} />
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[0.8125rem] font-semibold truncate"
                                                               style={{ color: isSelected ? '#ef4444' : 'var(--fg)' }}>
                                                                {displayName}
                                                            </p>
                                                        </div>
                                                        <span className="text-[0.6875rem] shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                                            {cinemaCount} 🎬
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        <div
                                            className="shrink-0 px-3 py-3 border-t flex gap-2"
                                            style={{ borderColor: 'var(--border)' }}
                                        >
                                            <button
                                                onClick={() => setModalOpen(false)}
                                                className="px-4 py-2 rounded-xl border text-[0.8125rem] transition-colors"
                                                style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }}
                                            >
                                                {t('seedCancel')}
                                            </button>
                                            <button
                                                onClick={handleDeleteSelected}
                                                disabled={selectedCityDocIds.size === 0 || deleting}
                                                className="flex-1 py-2 rounded-xl text-[0.8125rem] font-semibold transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                                style={{ background: '#ef4444', color: '#fff' }}
                                            >
                                                {deleting && <Loader2 size={13} className="animate-spin" />}
                                                {deleting ? steps.deleting : steps.deleteSelected(selectedCityDocIds.size)}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* ── Seeding ── */}
                        {step === 'seeding' && (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                                {!seedDone ? (
                                    <>
                                        <Loader2 size={36} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                        <p className="text-[0.8125rem] text-center" style={{ color: 'var(--fg-muted)' }}>
                                            {seedStatus}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-2xl">🎬</p>
                                        <p className="text-[0.875rem] text-center font-medium" style={{ color: 'var(--fg)' }}>
                                            {seedDone}
                                        </p>
                                        <button
                                            onClick={() => setModalOpen(false)}
                                            className="mt-2 px-6 py-2 rounded-xl text-[0.875rem] font-semibold transition-colors"
                                            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                                        >
                                            {t('seedClose')}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}