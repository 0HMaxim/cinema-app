import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { CINEMAS, type Technology } from '../data/cinemasData'

function getDateTabs() {
    const days: { date: Date; label: string; key: string }[] = []
    const now = new Date()
    const monthNames = ['СІЧНЯ','ЛЮТОГО','БЕРЕЗНЯ','КВІТНЯ','ТРАВНЯ','ЧЕРВНЯ','ЛИПНЯ','СЕРПНЯ','ВЕРЕСНЯ','ЖОВТНЯ','ЛИСТОПАДА','ГРУДНЯ']
    for (let i = 0; i < 7; i++) {
        const d = new Date(now)
        d.setDate(now.getDate() + i)
        days.push({ date: d, label: `${d.getDate()} ${monthNames[d.getMonth()]}`, key: d.toISOString().slice(0, 10) })
    }
    return days
}

const FORMAT_COLORS: Record<string, string> = {
    'IMAX': '#8b5cf6', 'ATMOS': '#3b82f6', 'LUX': '#0ea5e9',
    'VIP': '#f59e0b', 'CHILL': '#10b981', 'SDH': '#6b7280', 'ScreenX': '#ec4899',
}
function fmtColor(fmt: string) {
    for (const [k, v] of Object.entries(FORMAT_COLORS)) {
        if (fmt.toUpperCase().includes(k.toUpperCase())) return v
    }
    return '#6b7280'
}

export default function CinemaPage() {
    const { id } = useParams<{ id: string }>()
    const cinema = CINEMAS.find(c => c.id === id) ?? CINEMAS[0]

    const [selectedFormat, setSelectedFormat]   = useState('ALL')
    const [lightboxPhoto, setLightboxPhoto]     = useState<string | null>(null)
    const [posters, setPosters]                 = useState<Record<number, string>>({})

    const dateTabs   = getDateTabs()
    const allFormats = Array.from(new Set(cinema.movies.flatMap(m => m.sessions.map(s => s.format)))).sort()

    const TMDB_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI0MDI4Nzk1NWNkYWMxN2Y5YTY4YTMzNjQ3YTZkNGZkZSIsIm5iZiI6MTc4MTU2Njk0Ni4zNywic3ViIjoiNmEzMDhkZTJmNDczMDFlMWEwY2MxMzk4Iiwic2NvcGVzIjpbImFwaV9yZWFkIl0sInZlcnNpb24iOjF9.4mLzyZu3z4Ii3gSZz4oWZYTcRlb-rj4ZqZT9s22OvSo'

    useEffect(() => {
        const ids = cinema.movies.map(m => m.tmdbId)
        Promise.all(
            ids.map(tmdbId =>
                fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=uk-UA`, {
                    headers: { Authorization: `Bearer ${TMDB_TOKEN}` },
                })
                    .then(r => r.json())
                    .then(d => ({ tmdbId, path: d.poster_path as string | null }))
                    .catch(() => ({ tmdbId, path: null }))
            )
        ).then(results => {
            const map: Record<number, string> = {}
            results.forEach(({ tmdbId, path }) => { if (path) map[tmdbId] = `https://image.tmdb.org/t/p/w200${path}` })
            setPosters(map)
        })
    }, [cinema.id])

    const filteredMovies = cinema.movies
        .map(m => ({ ...m, sessions: m.sessions.filter(s => selectedFormat === 'ALL' || s.format.includes(selectedFormat)) }))
        .filter(m => m.sessions.length > 0)


    return (
        <div style={{ color: 'var(--fg)' }}>
            {/* Hero */}
            <div style={{ position: 'relative', maxWidth: '90%', margin: '0 auto', marginTop: 24, borderRadius: 20, overflow: 'hidden', height: 260 }}>
                <img
                    src={cinema.heroImage ?? 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&q=80'}
                    alt={cinema.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)' }} />
                <button style={{ position: 'absolute', bottom: 20, right: 24, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 40, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                    📞 Контакт-центр
                </button>
                <div style={{ position: 'absolute', bottom: 28, left: 32, color: '#fff' }}>
                    <p style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>Кінотеатр Multiplex у</p>
                    <h1 style={{ fontSize: 42, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, margin: 0 }}>{cinema.name}</h1>
                    <p style={{ marginTop: 10, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6, opacity: 0.85 }}>📍 {cinema.address}, {cinema.city}</p>
                </div>
            </div>

            <div style={{ maxWidth: '90%', margin: '0 auto', padding: '0 0 60px' }}>
                {/* Хлебные крошки */}
                <div style={{ padding: '14px 0', fontSize: 13, color: 'var(--fg-subtle)', display: 'flex', gap: 8 }}>
                    <Link to="/" style={{ color: 'var(--fg-subtle)', textDecoration: 'none' }}>Multiplex</Link>
                    <span>›</span>
                    <Link to="/cinemas" style={{ color: 'var(--fg-subtle)', textDecoration: 'none' }}>Кінотеатри</Link>
                    <span>›</span>
                    <span style={{ color: 'var(--fg)' }}>{cinema.name}</span>
                </div>

                {/* Дата-табы */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 6,
                    marginBottom: 20,
                }}>

                </div>

                {/* Фильтр форматов */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-subtle)', marginRight: 4 }}>ФОРМАТИ:</span>
                    {['ALL', ...allFormats].map(fmt => (
                        <button key={fmt} onClick={() => setSelectedFormat(fmt)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 11, fontWeight: 600, background: selectedFormat === fmt ? 'var(--accent)' : 'var(--surface-2)', color: selectedFormat === fmt ? 'var(--accent-fg)' : 'var(--fg)', transition: 'all 0.15s' }}>
                            {fmt === 'ALL' ? 'ВСІ' : fmt}
                        </button>
                    ))}
                </div>

                <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>👆</span> Натисніть на час сеансу, щоб обрати місця
                </p>

                {/* Фильмы */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {filteredMovies.map(movie => (
                        <div key={movie.tmdbId} style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                            <Link to={`/movie/${movie.tmdbId}`} style={{ flexShrink: 0 }}>
                                <div style={{ width: 80, height: 120, borderRadius: 10, overflow: 'hidden', background: 'var(--surface-2)' }}>
                                    {posters[movie.tmdbId]
                                        ? <img src={posters[movie.tmdbId]} alt={movie.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎬</div>
                                    }
                                </div>
                            </Link>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: '#dc2626', color: '#fff' }}>{movie.ageRating}</span>
                                    <Link to={`/movie/${movie.tmdbId}`} style={{ fontSize: 16, fontWeight: 600, color: 'var(--fg)', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                                        {movie.title}
                                    </Link>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {movie.sessions.map((s, i) => (
                                        <button key={i} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s', minWidth: 68 }}
                                                onMouseEnter={e => { e.currentTarget.style.borderColor = fmtColor(s.format); e.currentTarget.style.background = 'var(--surface-3)' }}
                                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)' }}>
                                            <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 14, lineHeight: 1 }}>{s.time}</div>
                                            <div style={{ fontSize: 9, marginTop: 3, color: fmtColor(s.format), fontWeight: 600 }}>{s.format}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Технологии */}
                <section style={{ marginTop: 64 }}>
                    <SectionTitle>Технології кінотеатру Multiplex у {cinema.name}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginTop: 24 }}>
                        {cinema.technologies.map(tech => <TechCard key={tech.id} tech={tech} />)}
                    </div>
                </section>

                {/* Фото */}
                <section style={{ marginTop: 60 }}>
                    <SectionTitle>Фотографії кінотеатру Multiplex у {cinema.name}</SectionTitle>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10, marginTop: 24 }}>
                        {cinema.photos.map((p, i) => (
                            <div key={i} onClick={() => setLightboxPhoto(p.url)} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', cursor: 'zoom-in' }}>
                                <img src={p.url} alt={p.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                                     onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                                     onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')} />
                            </div>
                        ))}
                    </div>
                </section>

                {/* Карта */}
                <section style={{ marginTop: 60 }}>
                    <SectionTitle>Як нас знайти</SectionTitle>
                    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
                        <div style={{ borderRadius: 16, overflow: 'hidden', height: 340, background: 'var(--surface-2)' }}>
                            <iframe title="map"
                                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${encodeURIComponent(cinema.address + ', ' + cinema.city)}`}
                                    width="100%" height="100%" style={{ border: 0, display: 'block' }} allowFullScreen loading="lazy" />
                        </div>
                        <div style={{ padding: 24, borderRadius: 16, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Адреса</p>
                                <p style={{ fontWeight: 600 }}>{cinema.address}</p>
                                <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{cinema.city}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Телефон</p>
                                <a href={`tel:${cinema.phone}`} style={{ fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', fontSize: 18 }}>{cinema.phone}</a>
                            </div>
                            <div>
                                <p style={{ fontSize: 11, color: 'var(--fg-subtle)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Зали</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    {cinema.halls.map(h => (
                                        <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                            <span>{h.name}</span>
                                            <span style={{ color: 'var(--fg-subtle)' }}>{h.capacity} місць</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {/* Lightbox */}
            {lightboxPhoto && (
                <div onClick={() => setLightboxPhoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, cursor: 'zoom-out' }}>
                    <img src={lightboxPhoto} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} />
                    <button onClick={() => setLightboxPhoto(null)} style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
            )}
        </div>
    )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>{children}</h2>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        </div>
    )
}

function TechCard({ tech }: { tech: Technology }) {
    const [hovered, setHovered] = useState(false)
    return (
        <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
             style={{ padding: '18px 20px', borderRadius: 14, border: `1px solid ${hovered ? 'var(--border-strong)' : 'var(--border)'}`, background: hovered ? 'var(--surface-3)' : 'var(--surface-2)', transition: 'all 0.2s', cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>{tech.icon}</span>
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.03em' }}>{tech.name}</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--fg-muted)', margin: 0 }}>{tech.description}</p>
        </div>
    )
}