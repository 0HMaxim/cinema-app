// src/components/SeedDataButton.tsx
import { useState } from 'react'
import { collection, getDocs, deleteDoc, doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase.ts'
import type { Cinema, Hall, Session, Seat, SeatCategory } from '../models/cinema'
import type { ConcessionItem } from '../models/order'

const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'

const CATEGORY_PRICES: Record<SeatCategory, number> = {
    STANDARD: 150, LUX: 220, SUPER_LUX: 310, CHILL_OUT: 280, VIP: 450,
}

const FORMATS = ['IMAX L 2D', 'SDH', 'ATMOS LUX', 'LUX SDH', 'Dolby Atmos']

// Зазор между сеансами в одном залі (хвилини)
const MIN_GAP_MINUTES = 5
// Час роботи кінотеатру
const DAY_START_MINUTES = 9 * 60   // 09:00
const DAY_END_MINUTES = 24 * 60    // 24:00
const SESSIONS_PER_HALL_PER_DAY = 5
const MAX_ATTEMPTS_PER_SESSION = 40
const DAYS_AHEAD = 7

const CONCESSIONS: Omit<ConcessionItem, 'id'>[] = [
    { name: 'Попкорн солодкий (M)', price: 95,  image: '🍿', quantity: 0 },
    { name: 'Попкорн солоний (L)',  price: 120, image: '🍿', quantity: 0 },
    { name: 'Кола 0.5л',            price: 55,  image: '🥤', quantity: 0 },
    { name: 'Начос із сиром',       price: 110, image: '🧀', quantity: 0 },
    { name: 'Хот-дог',              price: 85,  image: '🌭', quantity: 0 },
    { name: 'Вода 0.5л',            price: 35,  image: '💧', quantity: 0 },
    { name: 'Морозиво',             price: 65,  image: '🍦', quantity: 0 },
    { name: "M&M's",                price: 70,  image: '🍬', quantity: 0 },
]

// Кинотеатры — 5-6 в каждом городе
const CINEMA_SEEDS = [
    // Київ
    { name: 'CineMax Aladdin',       city: 'Київ',    address: 'вул. Хрещатик, 1' },
    { name: 'CineMax Ocean Plaza',   city: 'Київ',    address: 'вул. Антоновича, 176' },
    { name: 'CineMax Sky Mall',      city: 'Київ',    address: 'просп. Бажана, 34' },
    { name: 'CineMax Dream Town',    city: 'Київ',    address: 'вул. Маршала Тимошенка, 2' },
    { name: 'CineMax Lavina',        city: 'Київ',    address: 'вул. Берестейська, 2Б' },
    // Львів
    { name: 'CineMax Forum',         city: 'Львів',   address: 'вул. Городоцька, 22' },
    { name: 'CineMax King Cross',    city: 'Львів',   address: 'вул. Стрийська, 30' },
    { name: 'CineMax Victoria',      city: 'Львів',   address: 'просп. Свободи, 15' },
    { name: 'CineMax Skrynia',       city: 'Львів',   address: 'вул. Шевченка, 317' },
    { name: 'CineMax Tsum',          city: 'Львів',   address: 'вул. Лисенка, 12' },
    // Одеса
    { name: 'CineMax Sea Plaza',     city: 'Одеса',   address: 'вул. Дерибасівська, 5' },
    { name: 'CineMax Riviera',       city: 'Одеса',   address: 'вул. Французький бул., 60' },
    { name: 'CineMax Cascade',       city: 'Одеса',   address: 'вул. Сегедська, 8' },
    { name: 'CineMax Afina',         city: 'Одеса',   address: 'просп. Шевченка, 2А' },
    { name: 'CineMax Passage',       city: 'Одеса',   address: 'вул. Преображенська, 34' },
    // Дніпро
    { name: 'CineMax Appolo',        city: 'Дніпро',  address: 'просп. Дмитра Яворницького, 101' },
    { name: 'CineMax Most City',     city: 'Дніпро',  address: 'вул. Набережна Перемоги, 1' },
    { name: 'CineMax Karavan',       city: 'Дніпро',  address: 'вул. Запорізьке шосе, 60' },
    { name: 'CineMax Grand',         city: 'Дніпро',  address: 'вул. Робоча, 2' },
    { name: 'CineMax Menorah',       city: 'Дніпро',  address: 'вул. Шолом-Алейхема, 4' },
    // Харків
    { name: 'CineMax Lavina Kharkiv',city: 'Харків',  address: 'просп. Науки, 60' },
    { name: 'CineMax Fabrika',       city: 'Харків',  address: 'вул. Плеханівська, 126' },
    { name: 'CineMax Forum Kharkiv', city: 'Харків',  address: 'просп. Гагаріна, 22' },
    { name: 'CineMax City Center',   city: 'Харків',  address: 'вул. Клочківська, 192' },
    { name: 'CineMax Olimp',         city: 'Харків',  address: 'вул. Сумська, 70' },
]

interface MovieSeed { id: number; title: string; runtime: number }

// ─── Builders ───────────────────────────────────────────────────────────────

function generateSeats(rows: number, seatsPerRow: number): Seat[] {
    const seats: Seat[] = []
    for (let r = 1; r <= rows; r++) {
        for (let s = 1; s <= seatsPerRow; s++) {
            let category: SeatCategory = 'STANDARD'
            if (r === rows)          category = 'VIP'
            else if (r === rows - 1) category = 'SUPER_LUX'
            else if (r >= rows - 3)  category = 'LUX'
            else if (s <= 2 || s >= seatsPerRow - 1) category = 'CHILL_OUT'
            seats.push({ row: r, seat: s, category, price: CATEGORY_PRICES[category] })
        }
    }
    return seats
}

function buildHalls(): Hall[] {
    return [
        { id: crypto.randomUUID(), name: 'Зал 1 IMAX',   format: FORMATS[0], seats: generateSeats(10, 16) },
        { id: crypto.randomUUID(), name: 'Зал 2 SDH',    format: FORMATS[1], seats: generateSeats(8, 14) },
        { id: crypto.randomUUID(), name: 'Зал 3 ATMOS',  format: FORMATS[2], seats: generateSeats(7, 12) },
        { id: crypto.randomUUID(), name: 'Зал 4 VIP',    format: FORMATS[3], seats: generateSeats(5, 8) },
    ]
}

// Каждый кинотеатр получает случайное подмножество фильмов (3-5 из доступных)
function pickMoviesForCinema(movies: MovieSeed[], cinemaIndex: number): MovieSeed[] {
    // Детерминированно, но по-разному для каждого кинотеатра
    const count = 3 + (cinemaIndex % 3)  // 3, 4 или 5 фильмов
    const shifted = [...movies.slice(cinemaIndex % movies.length), ...movies.slice(0, cinemaIndex % movies.length)]
    return shifted.slice(0, count)
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function minsToTime(mins: number): string {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Рандомні сеанси для одного залу на одну дату, без перетину + мінімум MIN_GAP_MINUTES між ними
function generateRandomSessionsForHall(hall: Hall, movies: MovieSeed[], date: string): Session[] {
    const occupied: { start: number; end: number }[] = []
    const sessions: Session[] = []

    let attempts = 0
    while (sessions.length < SESSIONS_PER_HALL_PER_DAY && attempts < SESSIONS_PER_HALL_PER_DAY * MAX_ATTEMPTS_PER_SESSION) {
        attempts++

        const movie = movies[randomInt(0, movies.length - 1)]
        const latestStart = DAY_END_MINUTES - movie.runtime
        if (latestStart < DAY_START_MINUTES) continue

        const start = randomInt(DAY_START_MINUTES, latestStart)
        const end = start + movie.runtime

        const conflict = occupied.some(
            o => start < o.end + MIN_GAP_MINUTES && end > o.start - MIN_GAP_MINUTES
        )
        if (conflict) continue

        occupied.push({ start, end })
        sessions.push({
            id: crypto.randomUUID(),
            movieId: movie.id,
            movieTitle: movie.title,
            hallId: hall.id,
            date,
            time: minsToTime(start),
            format: hall.format,
            bookedSeats: [],
            durationMinutes: movie.runtime,
        } as Session)
    }

    return sessions.sort((a, b) => a.time.localeCompare(b.time))
}

function buildSessions(halls: Hall[], movies: MovieSeed[], cinemaIndex: number): Session[] {
    const cinemaMovies = pickMoviesForCinema(movies, cinemaIndex)

    const dates = Array.from({ length: DAYS_AHEAD }, (_, i) => {
        const d = new Date()
        d.setDate(d.getDate() + i)
        return d.toISOString().slice(0, 10)
    })

    const sessions: Session[] = []
    for (const date of dates) {
        for (const hall of halls) {
            sessions.push(...generateRandomSessionsForHall(hall, cinemaMovies, date))
        }
    }
    return sessions
}

async function fetchNowPlayingMovies(): Promise<MovieSeed[]> {
    // Берём now_playing + upcoming для разнообразия
    const [nowRes, upcomingRes] = await Promise.all([
        fetch('https://api.themoviedb.org/3/movie/now_playing?language=uk-UA&page=1&region=UA', {
            headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
        }).then(r => r.json()),
        fetch('https://api.themoviedb.org/3/movie/upcoming?language=uk-UA&page=1&region=UA', {
            headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
        }).then(r => r.json()),
    ])

    const combined: any[] = [
        ...(nowRes.results ?? []),
        ...(upcomingRes.results ?? []),
    ]

    // Убираем дубли по id
    const unique = Array.from(new Map(combined.map(m => [m.id, m])).values())
        .slice(0, 12)

    // Загружаем runtime для каждого фильма
    const withRuntime = await Promise.all(
        unique.map(async (m) => {
            try {
                const detail = await fetch(
                    `https://api.themoviedb.org/3/movie/${m.id}?language=uk-UA`,
                    { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } }
                ).then(r => r.json())
                return {
                    id: m.id,
                    title: m.title,
                    runtime: detail.runtime && detail.runtime > 60 ? detail.runtime : 110,
                } as MovieSeed
            } catch {
                return { id: m.id, title: m.title, runtime: 110 } as MovieSeed
            }
        })
    )

    return withRuntime
}

async function clearCollection(name: string) {
    const snap = await getDocs(collection(db, name))
    await Promise.all(snap.docs.map(d => deleteDoc(doc(db, name, d.id))))
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SeedDataButton() {
    const [loading, setLoading] = useState(false)
    const [status,  setStatus]  = useState('')

    const handleClick = async () => {
        if (loading) return
        const confirmed = window.confirm(
            'Це видалить ВСІ поточні кінотеатри й товари та замінить їх тестовими даними. Продовжити?'
        )
        if (!confirmed) return

        setLoading(true)
        setStatus('Завантаження фільмів з TMDB…')
        try {
            const movies = await fetchNowPlayingMovies()
            if (movies.length === 0) throw new Error('TMDB повернув 0 фільмів')

            setStatus(`Знайдено ${movies.length} фільмів. Очищення бази…`)
            await Promise.all([clearCollection('cinemas'), clearCollection('concessions')])

            setStatus('Створення кінотеатрів та сеансів…')
            const cinemas: Cinema[] = CINEMA_SEEDS.map((seed, i) => {
                const halls = buildHalls()
                return {
                    id: crypto.randomUUID(),
                    name: seed.name,
                    city: seed.city,
                    address: seed.address,
                    halls,
                    sessions: buildSessions(halls, movies, i),
                }
            })

            setStatus('Запис кінотеатрів до Firestore…')
            await Promise.all(cinemas.map(c => setDoc(doc(db, 'cinemas', c.id), c)))

            setStatus('Запис товарів (попкорн, напої тощо)…')
            await Promise.all(
                CONCESSIONS.map(item => {
                    const id = crypto.randomUUID()
                    return setDoc(doc(db, 'concessions', id), { id, ...item })
                })
            )

            const totalSessions = cinemas.reduce((sum, c) => sum + c.sessions.length, 0)

            setStatus('')
            alert(`✅ Готово! ${cinemas.length} кінотеатрів, ${movies.length} фільмів, ${totalSessions} сеансів на ${DAYS_AHEAD} днів, ${CONCESSIONS.length} товарів.`)
        } catch (err) {
            console.error(err)
            setStatus('')
            alert('Помилка під час заповнення бази. Дивись консоль.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handleClick}
                disabled={loading}
                className="h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-zinc-400
                           hover:bg-white/10 hover:text-white transition-all text-[13px] font-medium
                           flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {loading ? '⏳' : '🌱'}
                <span className="hidden sm:inline">
                    {loading ? 'Завантаження…' : 'Тестові дані'}
                </span>
            </button>
            {status && (
                <span className="text-[11px] text-zinc-500 hidden md:inline max-w-[200px] truncate">
                    {status}
                </span>
            )}
        </div>
    )
}