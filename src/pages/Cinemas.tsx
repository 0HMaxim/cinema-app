import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CINEMAS, type ComfortTag, type ContentTag, type ServiceTag, type TechTag, type Cinema } from '../data/cinemasData'

// ─── Фильтр-группы ────────────────────────────────────────────────────────────

const COMFORT_OPTIONS: ComfortTag[]  = ['Easy pass','VIP','LUX','Місця для людей з інвалідністю','Турнікети','Chill out']
const CONTENT_OPTIONS: ContentTag[]  = ['Theatre HD','Футбол','Original voice']
const SERVICE_OPTIONS: ServiceTag[]  = ['M cafe','Замовлення в залі','Оренда залу','Фотокабінка','Ігрові автомати','MClub','Дитяча кімната']
const TECH_OPTIONS:    TechTag[]     = ['TWINS','IMAX','LASER','ScreenX']

const CITIES = ['Всі міста','Дніпро','Житомир','Київ','Кривий Ріг','Миколаїв','Хмельницький','Чернігів','Харків','Львів','Полтава','Одеса','Черкаси','Луцьк','Ужгород']

// ─── Маркеры (приблизительные координаты для SVG карты) ─────────────────────

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

// ─── Утилиты ──────────────────────────────────────────────────────────────────

function TagBadge({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '5px 12px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? 'var(--accent-fg)' : 'var(--fg)',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </button>
    )
}

function FilterGroup({ title, options, active, toggle }: {
    title: string; options: string[]; active: Set<string>; toggle: (v: string) => void
}) {
    return (
        <div>
            <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 8, fontWeight: 600 }}>{title}:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {options.map(o => (
                    <TagBadge key={o} label={o} active={active.has(o)} onClick={() => toggle(o)} />
                ))}
            </div>
        </div>
    )
}

// ─── Карта Украины SVG (упрощённая форма) ────────────────────────────────────

function UkraineMap({ cinemas, selectedCity }: { cinemas: Cinema[]; selectedCity: string }) {
    // Считаем количество кинотеатров в городе
    const countByCity: Record<string, number> = {}
    cinemas.forEach(c => { countByCity[c.city] = (countByCity[c.city] ?? 0) + 1 })

    const pinsToShow = CITY_PINS.filter(p => countByCity[p.city] !== undefined)

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: 700, margin: '0 auto' }}>
            {/* Силуэт Украины через SVG path (упрощённый) */}
            <svg viewBox="0 0 100 80" style={{ width: '100%', display: 'block' }}>
                <defs>
                    <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#2a2a2a" />
                        <stop offset="100%" stopColor="#111" />
                    </radialGradient>
                </defs>
                {/* Фон */}
                <rect width="100" height="80" fill="url(#mapGlow)" rx="2" />

                {/* Упрощённый контур Украины */}
                <path
                    d="M8,32 L10,28 L15,25 L19,20 L25,18 L30,17 L35,15 L40,14 L43,16 L47,13 L52,12 L57,13 L60,10 L65,9 L70,11 L74,9 L80,12 L84,15 L88,18 L90,23 L92,28 L90,33 L88,38 L85,42 L83,47 L80,52 L76,58 L73,62 L70,65 L67,68 L63,72 L58,75 L53,76 L48,75 L44,73 L40,71 L36,70 L32,68 L28,66 L24,64 L20,60 L16,56 L12,52 L9,46 L8,40 Z"
                    fill="#2d2d2d"
                    stroke="#444"
                    strokeWidth="0.4"
                />
                {/* Крым */}
                <path
                    d="M56,68 L58,66 L62,65 L65,67 L63,70 L59,72 L56,70 Z"
                    fill="#252525"
                    stroke="#444"
                    strokeWidth="0.3"
                />

                {/* Пины */}
                {pinsToShow.map(pin => {
                    const count = countByCity[pin.city]
                    const isSelected = selectedCity === pin.city
                    return (
                        <g key={pin.city} style={{ cursor: 'pointer' }}>
                            {/* Тень */}
                            <circle cx={pin.x} cy={pin.y + 0.5} r={count > 1 ? 3.5 : 2.5} fill="rgba(0,0,0,0.4)" />
                            {/* Пин */}
                            <circle
                                cx={pin.x} cy={pin.y} r={count > 1 ? 3.2 : 2.4}
                                fill={isSelected ? '#ff6b6b' : '#e63535'}
                                stroke="#fff"
                                strokeWidth="0.5"
                            />
                            {/* Цифра если > 1 */}
                            {count > 1 && (
                                <text x={pin.x} y={pin.y + 0.8} textAnchor="middle" fontSize="2.4" fill="#fff" fontWeight="bold">
                                    {count}
                                </text>
                            )}
                        </g>
                    )
                })}
            </svg>
        </div>
    )
}

// ─── Карточка кинотеатра ──────────────────────────────────────────────────────

function CinemaCard({ cinema }: { cinema: Cinema }) {
    const navigate = useNavigate()
    const allTags = [...cinema.comfort, ...cinema.content, ...cinema.services, ...cinema.techs]

    return (
        <div
            style={{
                display: 'flex', gap: 0, borderRadius: 16, overflow: 'hidden',
                background: 'var(--surface)', border: '1px solid var(--border)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--border-strong)'
                el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.08)'
            }}
            onMouseLeave={e => {
                const el = e.currentTarget
                el.style.borderColor = 'var(--border)'
                el.style.boxShadow = 'none'
            }}
        >
            {/* Фото — кликабельно */}
            <div
                onClick={() => navigate(`/cinema/${cinema.id}`)}
                style={{ width: 200, flexShrink: 0, cursor: 'pointer', overflow: 'hidden' }}
            >
                <img
                    src={cinema.photo} alt={cinema.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                />
            </div>

            {/* Контент */}
            <div style={{ padding: '20px 24px', flex: 1, minWidth: 0 }}>
                {/* Заголовок */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <h3
                        onClick={() => navigate(`/cinema/${cinema.id}`)}
                        style={{ fontSize: 22, fontWeight: 700, margin: 0, cursor: 'pointer', letterSpacing: '-0.02em' }}
                        onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                        {cinema.name}
                    </h3>
                    <span style={{
                        padding: '2px 10px', borderRadius: 20,
                        background: 'var(--accent)', color: 'var(--accent-fg)',
                        fontSize: 11, fontWeight: 700,
                    }}>
                        {cinema.city}
                    </span>
                </div>

                <p style={{ fontSize: 13, color: 'var(--fg-muted)', marginBottom: 14 }}>
                    {cinema.address}
                </p>

                {/* Кнопка розклад */}
                <button
                    onClick={() => navigate(`/cinema/${cinema.id}`)}
                    style={{
                        padding: '9px 20px', borderRadius: 10, border: 'none',
                        background: '#e63535', color: '#fff',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'background 0.15s', marginBottom: 16,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#cc2a2a')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#e63535')}
                >
                    Дивитись розклад
                </button>

                {/* Теги */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {allTags.map(tag => (
                        <span key={tag} style={{
                            padding: '3px 10px', borderRadius: 6, fontSize: 11,
                            border: '1px solid var(--border-strong)',
                            background: 'var(--surface-2)', color: 'var(--fg-muted)',
                        }}>
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ─── Страница ─────────────────────────────────────────────────────────────────

export default function Cinemas() {
    const [selectedCity, setSelectedCity]       = useState('Всі міста')
    const [comfort, setComfort]                 = useState<Set<string>>(new Set())
    const [content, setContent]                 = useState<Set<string>>(new Set())
    const [services, setServices]               = useState<Set<string>>(new Set())
    const [techs, setTechs]                     = useState<Set<string>>(new Set())

    function toggle(set: Set<string>, setFn: (s: Set<string>) => void, val: string) {
        const next = new Set(set)
        next.has(val) ? next.delete(val) : next.add(val)
        setFn(next)
    }

    const filtered = useMemo(() => {
        return CINEMAS.filter(c => {
            if (selectedCity !== 'Всі міста' && c.city !== selectedCity) return false
            if (comfort.size  > 0 && ![...comfort].every(t  => c.comfort.includes(t as ComfortTag)))  return false
            if (content.size  > 0 && ![...content].every(t  => c.content.includes(t as ContentTag)))  return false
            if (services.size > 0 && ![...services].every(t => c.services.includes(t as ServiceTag))) return false
            if (techs.size    > 0 && ![...techs].every(t    => c.techs.includes(t as TechTag)))       return false
            return true
        })
    }, [selectedCity, comfort, content, services, techs])

    const hasFilters = comfort.size > 0 || content.size > 0 || services.size > 0 || techs.size > 0 || selectedCity !== 'Всі міста'

    return (
        <div style={{ color: 'var(--fg)', minHeight: '100vh' }}>

            {/* ── Карта ──────────────────────────────────────────────────── */}
            <div style={{ background: '#111', padding: '32px 0 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
                    <UkraineMap cinemas={filtered} selectedCity={selectedCity} />
                </div>
            </div>

            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px 60px' }}>

                {/* ── Фильтры ────────────────────────────────────────────── */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: '24px 32px',
                    padding: '24px 28px', borderRadius: 16, marginBottom: 32,
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    alignItems: 'start',
                }}>
                    {/* Місто — дропдаун */}
                    <div>
                        <p style={{ fontSize: 12, color: 'var(--fg-subtle)', marginBottom: 8, fontWeight: 600 }}>Місто:</p>
                        <select
                            value={selectedCity}
                            onChange={e => setSelectedCity(e.target.value)}
                            style={{
                                padding: '7px 32px 7px 12px', borderRadius: 8, fontSize: 13,
                                border: '1px solid var(--border-strong)',
                                background: selectedCity !== 'Всі міста' ? 'var(--accent)' : 'var(--surface-2)',
                                color: selectedCity !== 'Всі міста' ? 'var(--accent-fg)' : 'var(--fg)',
                                cursor: 'pointer', fontWeight: 600, appearance: 'none',
                                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23666' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`,
                                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                            }}
                        >
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <FilterGroup title="Комфорт"          options={COMFORT_OPTIONS}  active={comfort}  toggle={v => toggle(comfort, setComfort, v)} />
                    <FilterGroup title="Контент"          options={CONTENT_OPTIONS}  active={content}  toggle={v => toggle(content, setContent, v)} />
                    <FilterGroup title="Додаткові послуги" options={SERVICE_OPTIONS} active={services} toggle={v => toggle(services, setServices, v)} />
                    <FilterGroup title="Технології"       options={TECH_OPTIONS}     active={techs}    toggle={v => toggle(techs, setTechs, v)} />
                </div>

                {/* Сброс + счётчик */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                        Кінотеатри
                        <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--fg-muted)', marginLeft: 8 }}>
                            {filtered.length}
                        </span>
                    </h2>
                    {hasFilters && (
                        <button
                            onClick={() => { setSelectedCity('Всі міста'); setComfort(new Set()); setContent(new Set()); setServices(new Set()); setTechs(new Set()) }}
                            style={{
                                padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border-strong)',
                                background: 'var(--surface-2)', color: 'var(--fg-muted)',
                                fontSize: 12, cursor: 'pointer',
                            }}
                        >
                            ✕ Скинути фільтри
                        </button>
                    )}
                </div>

                {/* ── Список ─────────────────────────────────────────────── */}
                {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--fg-muted)' }}>
                        <p style={{ fontSize: 40, marginBottom: 12 }}>🎬</p>
                        <p>Жодного кінотеатру не знайдено за вибраними фільтрами</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {filtered.map(c => <CinemaCard key={c.id} cinema={c} />)}
                    </div>
                )}
            </div>
        </div>
    )
}