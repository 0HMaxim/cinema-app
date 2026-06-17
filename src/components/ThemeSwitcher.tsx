import { useState, useRef, useEffect } from 'react'
import { useApp, type Theme } from '../context/AppContext'

// Готовые пресеты градиентов
const PRESETS: Record<Theme, Array<{ label: string; from: string; to: string }>> = {
    light: [
        { label: 'Лаванда',  from: '#f0f4ff', to: '#fdf0ff' },
        { label: 'Мята',     from: '#f0fff8', to: '#f0f9ff' },
        { label: 'Персик',   from: '#fff7f0', to: '#fff0f5' },
        { label: 'Серый',    from: '#f5f5f7', to: '#ececf0' },
        { label: 'Золото',   from: '#fffbea', to: '#fff5e0' },
    ],
    dark: [
        { label: 'Космос',   from: '#0d0f14', to: '#12101a' },
        { label: 'Бездна',   from: '#080c14', to: '#100818' },
        { label: 'Лес',      from: '#091210', to: '#0c1510' },
        { label: 'Кино',     from: '#100808', to: '#180a14' },
        { label: 'Сталь',    from: '#0a0c10', to: '#0e1018' },
    ],
}

export default function ThemeSwitcher() {
    const { theme, toggleTheme, gradients, setGradient } = useApp()
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const isDark = theme === 'dark'

    const currentGradient = gradients[theme]

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={ref} className="relative flex items-center gap-1">

            {/* Кнопка переключения темы */}
            <button
                onClick={toggleTheme}
                aria-label="Переключить тему"
                title={isDark ? 'Светлая тема' : 'Тёмная тема'}
                style={{
                    width: 36, height: 36, borderRadius: 12,
                    border: `1px solid var(--border-strong)`,
                    background: 'var(--surface-2)',
                    color: isDark ? '#fde047' : '#6b7280',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 16, transition: 'all 0.15s',
                }}
            >
                {isDark ? '☀️' : '🌙'}
            </button>

            {/* Кнопка открытия пикера градиента */}
            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Настроить градиент фона"
                title="Настроить фон"
                style={{
                    width: 28, height: 28, borderRadius: 8,
                    border: `1.5px solid var(--border-strong)`,
                    background: `linear-gradient(135deg, ${currentGradient.from}, ${currentGradient.to})`,
                    cursor: 'pointer', flexShrink: 0,
                    outline: open ? `2px solid var(--accent)` : 'none',
                    outlineOffset: 1,
                }}
            />

            {/* Дропдаун */}
            {open && (
                <div style={{
                    position: 'absolute', top: 44, right: 0, zIndex: 100,
                    background: 'var(--surface)',
                    border: '1px solid var(--border-strong)',
                    borderRadius: 14, padding: '14px 16px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                    minWidth: 230,
                }}>
                    <p style={{ fontSize: 11, color: 'var(--fg-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Фон • {isDark ? 'тёмная' : 'светлая'} тема
                    </p>

                    {/* Пресеты */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                        {PRESETS[theme].map(p => {
                            const active = p.from === currentGradient.from && p.to === currentGradient.to
                            return (
                                <button
                                    key={p.label}
                                    onClick={() => setGradient(theme, { from: p.from, to: p.to })}
                                    title={p.label}
                                    style={{
                                        width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                                        background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
                                        border: active ? `2px solid var(--accent)` : '2px solid transparent',
                                        outline: active ? `1px solid var(--accent)` : 'none',
                                        transition: 'all 0.1s',
                                    }}
                                />
                            )
                        })}
                    </div>

                    {/* Кастомные пикеры цветов */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <ColorRow
                            label="Начало"
                            value={currentGradient.from}
                            onChange={val => setGradient(theme, { ...currentGradient, from: val })}
                        />
                        <ColorRow
                            label="Конец"
                            value={currentGradient.to}
                            onChange={val => setGradient(theme, { ...currentGradient, to: val })}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}

function ColorRow({ label, value, onChange }: {
    label: string
    value: string
    onChange: (v: string) => void
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--fg-muted)', width: 50 }}>{label}</span>
            <div style={{ position: 'relative', width: 28, height: 28, borderRadius: 7, overflow: 'hidden', border: '1px solid var(--border-strong)', flexShrink: 0 }}>
                <div style={{ width: '100%', height: '100%', background: value }} />
                <input
                    type="color"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{
                        position: 'absolute', inset: 0, opacity: 0,
                        cursor: 'pointer', width: '100%', height: '100%',
                    }}
                />
            </div>
            <code style={{ fontSize: 11, color: 'var(--fg-subtle)', fontFamily: 'monospace' }}>{value}</code>
        </div>
    )
}