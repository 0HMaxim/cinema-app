// src/pages/Home.tsx
import { useEffect, useState, useRef } from 'react'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '../firebase'
import PosterRow from "../components/PosterRow.tsx"
import { MapPin } from 'lucide-react'
import { Link } from "react-router-dom"
import { useApp } from '../context/AppContext'

interface CinemaInfo {
    id: string
    name: string
    city: string
    address: string
}

// Один кинотеатр — монтирует PosterRow только когда виден
function LazyCinemaRow({ cinema }: { cinema: CinemaInfo }) {
    const ref = useRef<HTMLDivElement>(null)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
            { rootMargin: '200px' }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div ref={ref}>
            <div className="px-6 pt-8 pb-3 flex items-baseline gap-2">
                <Link
                    to={`/cinema/${cinema.id}`}
                    className="text-lg font-bold transition-colors"
                    style={{ color: 'var(--fg)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--fg)'}
                >
                    {cinema.name}
                </Link>
                {cinema.address && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--fg-subtle)' }}>
                        <MapPin size={11} />
                        {cinema.address}
                    </span>
                )}
            </div>
            <div style={{ height: '70vh' }}>
                {visible
                    ? <PosterRow cinemaId={cinema.id} showHeader={false} />
                    : <div className="h-full animate-pulse" style={{ background: 'var(--surface-2)' }} />
                }
            </div>
        </div>
    )
}

export default function Home() {
    const { selectedCinemaId, t } = useApp()

    const [cinemas, setCinemas]   = useState<CinemaInfo[]>([])
    const [loading, setLoading]   = useState(true)
    const [activeCity, setActiveCity] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        getDocs(collection(db, 'cinemas')).then(snapshot => {
            if (cancelled) return
            const list = snapshot.docs.map(d => ({
                id: d.id,
                name: (d.data() as any).name ?? '',
                city: (d.data() as any).city ?? '',
                address: (d.data() as any).address ?? '',
            }))
            setCinemas(list)
            setLoading(false)
        })
        return () => { cancelled = true }
    }, [])

    // Если выбран кинотеатр — предустановить его город
    useEffect(() => {
        if (!selectedCinemaId || cinemas.length === 0) return
        const found = cinemas.find(c => c.id === selectedCinemaId)
        if (found) setActiveCity(found.city)
    }, [selectedCinemaId, cinemas])

    const cities = [...new Set(cinemas.map(c => c.city))].sort()
    const filtered = activeCity ? cinemas.filter(c => c.city === activeCity) : cinemas

    if (loading) {
        return (
            <div>
                {Array(2).fill(0).map((_, i) => (
                    <div key={i} style={{ height: '70vh', background: 'var(--surface-2)' }}
                         className="animate-pulse mb-1" />
                ))}
            </div>
        )
    }

    if (cinemas.length === 0) {
        return (
            <div className="flex items-center justify-center" style={{ height: '70vh' }}>
                <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>t('noCinemas')</p>
            </div>
        )
    }

    return (
        <div>
            {/* Фильтр по городу */}
            <div className="flex gap-2 px-6 pt-6 pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden">
                <button
                    onClick={() => setActiveCity(null)}
                    className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all"
                    style={!activeCity
                        ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                        : { borderColor: 'var(--border-strong)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }
                    }
                >
                    {t('cityAll')}
                </button>
                {cities.map(city => (
                    <button
                        key={city}
                        onClick={() => setActiveCity(city)}
                        className="shrink-0 px-4 py-1.5 rounded-full text-[13px] font-medium border transition-all"
                        style={activeCity === city
                            ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: 'var(--accent-fg)' }
                            : { borderColor: 'var(--border-strong)', background: 'var(--surface-2)', color: 'var(--fg-muted)' }
                        }
                    >
                        {city}
                    </button>
                ))}
            </div>

            {filtered.map(cinema => (
                <LazyCinemaRow key={cinema.id} cinema={cinema} />
            ))}
        </div>
    )
}