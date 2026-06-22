import { useState, useRef, useEffect } from 'react'
import { useApp, type Theme, THEME_PRESETS } from '../context/AppContext'
import { RotateCcw, Sun, Moon, Palette } from 'lucide-react'

const GRADIENT_PRESETS: Record<Theme, Array<{ label: string; from: string; to: string }>> = {
    light: [
        { label: 'Лаванда', from: '#f0f4ff', to: '#fdf0ff' },
        { label: 'Мята',    from: '#f0fff8', to: '#f0f9ff' },
        { label: 'Персик',  from: '#fff7f0', to: '#fff0f5' },
        { label: 'Серый',   from: '#f5f5f7', to: '#ececf0' },
        { label: 'Золото',  from: '#fffbea', to: '#fff5e0' },
    ],
    dark: [
        { label: 'Космос', from: '#0d0f14', to: '#12101a' },
        { label: 'Бездна', from: '#080c14', to: '#100818' },
        { label: 'Лес',    from: '#091210', to: '#0c1510' },
        { label: 'Кино',   from: '#100808', to: '#180a14' },
        { label: 'Сталь',  from: '#0a0c10', to: '#0e1018' },
    ],
}

const ACCENT_PRESETS = [
    '#facc15', '#f97316', '#ef4444', '#ec4899',
    '#a855f7', '#3b82f6', '#06b6d4', '#10b981',
]

const UI_GRADIENT_PRESETS = [
    { label: 'Закат',  value: 'linear-gradient(135deg, #f97316, #ec4899)' },
    { label: 'Океан',  value: 'linear-gradient(135deg, #06b6d4, #3b82f6)' },
    { label: 'Лес',    value: 'linear-gradient(135deg, #10b981, #06b6d4)' },
    { label: 'Аврора', value: 'linear-gradient(135deg, #a855f7, #3b82f6)' },
    { label: 'Золото', value: 'linear-gradient(135deg, #facc15, #f97316)' },
    { label: 'Роза',   value: 'linear-gradient(135deg, #ec4899, #a855f7)' },
    { label: 'Огонь',  value: 'linear-gradient(135deg, #ef4444, #f97316)' },
    { label: 'Мята',   value: 'linear-gradient(135deg, #10b981, #a855f7)' },
]

const GRADIENT_DIRS = [
    { label: '→', value: 'to right' },
    { label: '↘', value: 'to bottom right' },
    { label: '↓', value: 'to bottom' },
    { label: '↙', value: 'to bottom left' },
    { label: '←', value: 'to left' },
    { label: '↖', value: 'to top left' },
    { label: '↑', value: 'to top' },
    { label: '↗', value: 'to top right' },
]

// ─── Цели градиента с локализацией ───────────────────────────────────────────
type GradientTarget = 'accent' | 'surface' | 'surface2' | 'bg' | 'text' | 'navbar' | 'custom'

const GRADIENT_TARGETS: { value: GradientTarget; label: string }[] = [
    { value: 'bg',       label: 'Фон'      },
    { value: 'surface',  label: 'Панели'   },
    { value: 'surface2', label: 'Карточки' },
    { value: 'accent',   label: 'Кнопки'   },
    { value: 'navbar',   label: 'Navbar'   },
    { value: 'text',     label: 'Текст'    },
    { value: 'custom',   label: 'Элемент →'},
]

type Tab = 'presets' | 'bg' | 'accent' | 'ui-gradient'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function luminance(hex: string): number {
    const h = hex.replace('#', '')
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

function firstColorFromGradient(css: string): string {
    const m = css.match(/#[0-9a-fA-F]{3,6}/)
    return m ? m[0] : '#facc15'
}

function parseGradient2(css: string): { dir: string; from: string; to: string } {
    const m = css.match(/linear-gradient\(([^,]+),\s*(#[0-9a-fA-F]+)[^,]*,\s*(#[0-9a-fA-F]+)/)
    if (m) return { dir: m[1].trim(), from: m[2], to: m[3] }
    return { dir: '135deg', from: '#facc15', to: '#f97316' }
}

function buildGradient(dir: string, from: string, to: string): string {
    return `linear-gradient(${dir}, ${from}, ${to})`
}

function normalizeGradientCss(raw: string): string {
    const matches = raw.match(/linear-gradient\([^)]+\)/g)
    if (matches && matches.length > 0) return matches[matches.length - 1]
    return raw.trim()
}

// ─── Ключевые функции применения ──────────────────────────────────────────────
// Применяет градиент как background сразу ко всем элементам страницы по переменной
function applyGradientVar(target: Exclude<GradientTarget, 'custom'>, gradient: string) {
    const root = document.documentElement

    switch (target) {
        case 'accent': {
            const fromAccent = firstColorFromGradient(gradient)
            root.style.setProperty('--accent', fromAccent)
            root.style.setProperty('--accent-fg', luminance(fromAccent) > 0.5 ? '#000' : '#fff')
            // Применяем градиент напрямую всем элементам с var(--accent) через новую переменную
            // Кнопки должны использовать --accent-bg-gradient если он задан
            root.style.setProperty('--accent-bg-value', gradient)
            // Обновляем все inline-style кнопки через CSS-переменную
            document.querySelectorAll<HTMLElement>('[data-accent-bg]').forEach(el => {
                el.style.background = gradient
            })
            break
        }

        case 'surface': {
            // --surface используется как background панелей (movie card, cinema card, etc.)
            // Поскольку элементы используют var(--surface), нужно переопределить переменную
            // Но var() не принимает gradient, поэтому применяем напрямую к элементам
            root.style.setProperty('--surface', firstColorFromGradient(gradient))
            // Применяем градиент ко всем элементам которые используют --surface
            document.querySelectorAll<HTMLElement>(
                '[style*="var(--surface)"], .movie-card, .cinema-card'
            ).forEach(el => {
                if (el.style.background?.includes('var(--surface)') ||
                    getComputedStyle(el).background.includes('rgb(22, 24, 31)') ||
                    getComputedStyle(el).background.includes('rgb(255, 255, 255)')) {
                    el.style.background = gradient
                }
            })
            // Самый надёжный способ — CSS custom property + новый класс
            // Вставляем <style> тег с переопределением
            upsertStyleTag('surface-gradient', `
                :root { --surface-override: ${gradient}; }
                [style*="background: var(--surface)"],
                [style*="background:var(--surface)"] {
                    background: ${gradient} !important;
                }
            `)
            break
        }

        case 'surface2': {
            root.style.setProperty('--surface-2', firstColorFromGradient(gradient))
            upsertStyleTag('surface2-gradient', `
                :root { --surface-2-override: ${gradient}; }
                [style*="background: var(--surface-2)"],
                [style*="background:var(--surface-2)"] {
                    background: ${gradient} !important;
                }
            `)
            break
        }

        case 'bg': {
            root.style.setProperty('--bg-gradient', gradient)
            const parsed = parseGradient2(gradient)
            root.style.setProperty('--bg-from', parsed.from)
            root.style.setProperty('--bg-to', parsed.to)
            break
        }

        case 'navbar': {
            upsertStyleTag('navbar-gradient', `
                nav, header, [class*="navbar"], [class*="Navbar"] {
                    background: ${gradient} !important;
                }
            `)
            break
        }

        case 'text': {
            upsertStyleTag('text-gradient', `
                body, p, span, h1, h2, h3, h4, h5, h6 {
                    background: ${gradient};
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }
            `)
            break
        }
    }
}

/** Создаёт или обновляет <style> тег с заданным id */
function upsertStyleTag(id: string, css: string) {
    let el = document.getElementById(`theme-override-${id}`) as HTMLStyleElement | null
    if (!el) {
        el = document.createElement('style')
        el.id = `theme-override-${id}`
        document.head.appendChild(el)
    }
    el.textContent = css
}

/** Удаляет <style> тег */
function removeStyleTag(id: string) {
    document.getElementById(`theme-override-${id}`)?.remove()
}

// ─── Произвольные элементы ────────────────────────────────────────────────────
const customApplied: Array<{ el: HTMLElement; prevBg: string }> = []

function applyGradientToSelector(selector: string, gradient: string): number {
    for (const { el, prevBg } of customApplied) el.style.background = prevBg
    customApplied.length = 0
    try {
        const elements = document.querySelectorAll<HTMLElement>(selector)
        elements.forEach(el => {
            customApplied.push({ el, prevBg: el.style.background })
            el.style.background = gradient
        })
        return elements.length
    } catch { return 0 }
}

function resetGradientFromSelector() {
    for (const { el, prevBg } of customApplied) el.style.background = prevBg
    customApplied.length = 0
}

// ─── Компонент ────────────────────────────────────────────────────────────────
export default function ThemeSwitcher() {
    const { theme, toggleTheme, gradients, setGradient, colors, setColor, resetColors, applyPreset } = useApp()

    const [open, setOpen] = useState(false)
    const [tab,  setTab]  = useState<Tab>('presets')
    const [pos,  setPos]  = useState({ top: 0, right: 0 })

    const [gradTarget,     setGradTarget]     = useState<GradientTarget>('bg')
    const [gradDir,        setGradDir]        = useState('135deg')
    const [gradFrom,       setGradFrom]       = useState('#facc15')
    const [gradTo,         setGradTo]         = useState('#f97316')
    const [gradCss,        setGradCss]        = useState('')
    const [customSelector, setCustomSelector] = useState('')
    const [selectorCount,  setSelectorCount]  = useState(0)
    const [selectorError,  setSelectorError]  = useState('')

    const ref    = useRef<HTMLDivElement>(null)
    const btnRef = useRef<HTMLButtonElement>(null)

    const isDark          = theme === 'dark'
    const currentGradient = gradients[theme]
    const currentColors   = colors[theme]

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    useEffect(() => {
        if (gradTarget !== 'custom' || !customSelector.trim()) {
            setSelectorCount(0); setSelectorError(''); return
        }
        try {
            const count = document.querySelectorAll(customSelector).length
            setSelectorCount(count)
            setSelectorError(count === 0 ? 'Элементы не найдены' : '')
        } catch { setSelectorCount(0); setSelectorError('Невалидный селектор') }
    }, [customSelector, gradTarget, open])

    const openPicker = () => {
        if (btnRef.current) {
            const r = btnRef.current.getBoundingClientRect()
            setPos({ top: r.bottom + 8, right: window.innerWidth - r.right })
        }
        setOpen(v => !v)
    }

    const previewCss = gradCss.trim()
        ? normalizeGradientCss(gradCss)
        : buildGradient(gradDir, gradFrom, gradTo)

    const applyUiGradient = () => {
        const css = gradCss.trim() ? normalizeGradientCss(gradCss) : buildGradient(gradDir, gradFrom, gradTo)
        if (gradTarget === 'custom') {
            if (!customSelector.trim()) return
            setSelectorCount(applyGradientToSelector(customSelector, css))
        } else {
            applyGradientVar(gradTarget, css)
        }
    }

    const resetUiGradient = () => {
        const root = document.documentElement
        if (gradTarget === 'custom') { resetGradientFromSelector(); return }
        switch (gradTarget) {
            case 'accent':
                root.style.setProperty('--accent', currentColors.accent)
                break
            case 'surface':
                removeStyleTag('surface-gradient')
                root.style.setProperty('--surface', currentColors.surface)
                break
            case 'surface2':
                removeStyleTag('surface2-gradient')
                root.style.setProperty('--surface-2', currentColors.surface2)
                break
            case 'bg':
                root.style.removeProperty('--bg-gradient')
                root.style.setProperty('--bg-from', currentGradient.from)
                root.style.setProperty('--bg-to', currentGradient.to)
                break
            case 'navbar':
                removeStyleTag('navbar-gradient')
                break
            case 'text':
                removeStyleTag('text-gradient')
                break
        }
    }

    return (
        <div ref={ref} className="relative flex items-center gap-1">

            <button
                onClick={toggleTheme}
                className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all hover:scale-105 active:scale-95"
                style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-2)', color: isDark ? '#fde047' : '#6b7280' }}
                title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <button
                ref={btnRef}
                onClick={openPicker}
                className="w-7 h-7 rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                style={{
                    background: `linear-gradient(135deg, ${currentGradient.from}, ${currentGradient.to})`,
                    borderColor: open ? 'var(--accent)' : 'var(--border-strong)',
                    outline: open ? '2px solid var(--accent)' : 'none',
                    outlineOffset: 1,
                }}
                title="Настроить тему"
            />

            {open && (
                <div
                    className="fixed z-[999] rounded-2xl border overflow-hidden"
                    style={{
                        top: pos.top, right: pos.right, width: 300,
                        background: 'var(--surface)',
                        borderColor: 'var(--border-strong)',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                    }}
                >
                    {/* Шапка */}
                    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex items-center gap-2">
                            <Palette size={13} style={{ color: 'var(--accent)' }} />
                            <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                                {isDark ? '🌙 Тёмная' : '☀️ Светлая'} тема
                            </span>
                        </div>
                        <button
                            onClick={() => {
                                resetColors(theme)
                                // Сбрасываем все style-теги
                                ;['surface-gradient','surface2-gradient','navbar-gradient','text-gradient'].forEach(removeStyleTag)
                                const root = document.documentElement
                                root.style.removeProperty('--bg-gradient')
                            }}
                            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg hover:opacity-80"
                            style={{ color: 'var(--fg-muted)', background: 'var(--surface-2)' }}
                        >
                            <RotateCcw size={10} /> Сброс
                        </button>
                    </div>

                    {/* Табы */}
                    <div className="flex border-b" style={{ borderColor: 'var(--border)' }}>
                        {(['presets', 'bg', 'accent', 'ui-gradient'] as Tab[]).map(t => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className="flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors"
                                style={{
                                    color: tab === t ? 'var(--accent)' : 'var(--fg-muted)',
                                    borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                                    background: 'transparent',
                                }}
                            >
                                {t === 'presets' ? 'Темы' : t === 'bg' ? 'Фон' : t === 'accent' ? 'Цвета' : 'Градиент'}
                            </button>
                        ))}
                    </div>

                    <div className="p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">

                        {/* ── Таб: Пресеты тем ── */}
                        {tab === 'presets' && (
                            <>
                                {(['light', 'dark'] as Theme[]).map(themeGroup => (
                                    <div key={themeGroup}>
                                        <p className="text-[10px] uppercase tracking-widest mb-3"
                                           style={{ color: 'var(--fg-subtle)' }}>
                                            {themeGroup === 'light' ? '☀️ Светлые' : '🌙 Тёмные'}
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            {THEME_PRESETS.filter(p => p.theme === themeGroup).map(preset => {
                                                const isActive =
                                                    theme === preset.theme &&
                                                    gradients[theme].from === preset.gradient.from &&
                                                    colors[theme].accent === preset.colors.accent
                                                return (
                                                    <button
                                                        key={preset.id}
                                                        onClick={() => applyPreset(preset)}
                                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all hover:scale-[1.01] active:scale-[0.99]"
                                                        style={{
                                                            borderColor: isActive ? 'var(--accent)' : 'var(--border)',
                                                            background: isActive
                                                                ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
                                                                : 'var(--surface-2)',
                                                        }}
                                                    >
                                                        <div className="w-10 h-10 rounded-lg shrink-0 border"
                                                             style={{
                                                                 background: `linear-gradient(135deg, ${preset.gradient.from}, ${preset.gradient.to})`,
                                                                 borderColor: 'var(--border-strong)',
                                                                 boxShadow: `inset 0 0 0 2px ${preset.colors.accent}55`,
                                                             }} />
                                                        <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                                                            <span className="text-xs font-semibold" style={{ color: 'var(--fg)' }}>
                                                                {preset.label}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                <div className="w-3 h-3 rounded-full" style={{ background: preset.colors.accent }} />
                                                                <span className="text-[9px] font-mono" style={{ color: 'var(--fg-subtle)' }}>
                                                                    {preset.colors.accent}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {isActive && (
                                                            <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                                                                 style={{ background: 'var(--accent)' }}>
                                                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                                                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5"
                                                                          strokeLinecap="round" style={{ color: 'var(--accent-fg)' }} />
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}

                        {/* ── Таб: Фон ── */}
                        {tab === 'bg' && (
                            <>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--fg-subtle)' }}>Пресеты фона</p>
                                    <div className="flex flex-wrap gap-2">
                                        {GRADIENT_PRESETS[theme].map(p => {
                                            const active = p.from === currentGradient.from && p.to === currentGradient.to
                                            return (
                                                <button
                                                    key={p.label}
                                                    onClick={() => setGradient(theme, { from: p.from, to: p.to })}
                                                    title={p.label}
                                                    className="w-8 h-8 rounded-lg transition-all hover:scale-110 relative group"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${p.from}, ${p.to})`,
                                                        border: active ? '2px solid var(--accent)' : '2px solid var(--border-strong)',
                                                    }}
                                                >
                                                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                                                          style={{ color: 'var(--fg-subtle)' }}>{p.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2.5 pt-2">
                                    <ColorRow label="Начало" value={currentGradient.from}
                                              onChange={v => setGradient(theme, { ...currentGradient, from: v })} />
                                    <ColorRow label="Конец"  value={currentGradient.to}
                                              onChange={v => setGradient(theme, { ...currentGradient, to: v })} />
                                </div>
                            </>
                        )}

                        {/* ── Таб: Цвета ── */}
                        {tab === 'accent' && (
                            <>
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--fg-subtle)' }}>Акцент (кнопки, ссылки)</p>
                                    <div className="flex flex-wrap gap-2 mb-2.5">
                                        {ACCENT_PRESETS.map(color => {
                                            const active = currentColors.accent === color
                                            return (
                                                <button key={color} onClick={() => setColor(theme, { accent: color })}
                                                        className="w-7 h-7 rounded-lg transition-all hover:scale-110"
                                                        style={{
                                                            background: color,
                                                            border: active ? '2px solid var(--fg)' : '2px solid transparent',
                                                            outline: active ? '1px solid var(--fg)' : 'none',
                                                            outlineOffset: 1,
                                                        }} />
                                            )
                                        })}
                                    </div>
                                    <ColorRow label="Акцент" value={currentColors.accent}
                                              onChange={v => setColor(theme, { accent: v })} />
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>Панели (карточки фильмов)</p>
                                    <ColorRow label="Панель"   value={currentColors.surface}
                                              onChange={v => setColor(theme, { surface: v })} />
                                    <ColorRow label="Подложка" value={currentColors.surface2}
                                              onChange={v => setColor(theme, { surface2: v })} />
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>Текст</p>
                                    <ColorRow label="Основной"    value={currentColors.fg}
                                              onChange={v => setColor(theme, { fg: v })} />
                                    <ColorRow label="Приглушён." value={currentColors.fgMuted}
                                              onChange={v => setColor(theme, { fgMuted: v })} />
                                </div>
                            </>
                        )}

                        {/* ── Таб: UI Градиент ── */}
                        {tab === 'ui-gradient' && (
                            <>
                                {/* Куда применить */}
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--fg-subtle)' }}>Применить к</p>
                                    <div className="grid grid-cols-4 gap-1">
                                        {GRADIENT_TARGETS.map(tgt => (
                                            <button
                                                key={tgt.value}
                                                onClick={() => setGradTarget(tgt.value)}
                                                className="py-1.5 px-1 rounded-lg text-[10px] font-semibold border transition-all"
                                                style={{
                                                    background:  gradTarget === tgt.value ? 'var(--accent-bg)' : 'var(--surface-2)',
                                                    borderColor: gradTarget === tgt.value ? 'var(--accent-border)' : 'var(--border)',
                                                    color:       gradTarget === tgt.value ? 'var(--accent)' : 'var(--fg-muted)',
                                                }}
                                            >
                                                {tgt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Произвольный селектор */}
                                {gradTarget === 'custom' && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-subtle)' }}>
                                            CSS-селектор
                                        </p>
                                        <input
                                            type="text"
                                            value={customSelector}
                                            onChange={e => setCustomSelector(e.target.value)}
                                            placeholder=".movie-card, button, #hero"
                                            className="w-full rounded-lg px-3 py-1.5 text-[11px] font-mono outline-none"
                                            style={{
                                                background: 'var(--surface-2)',
                                                border: `1px solid ${selectorError ? '#ef4444' : 'var(--border)'}`,
                                                color: 'var(--fg)',
                                            }}
                                        />
                                        <p className="text-[9px] mt-1" style={{ color: selectorError ? '#ef4444' : 'var(--fg-subtle)' }}>
                                            {selectorError || (customSelector ? `Найдено: ${selectorCount} эл.` : 'Введите CSS-селектор')}
                                        </p>
                                    </div>
                                )}

                                {/* Пресеты */}
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest mb-2" style={{ color: 'var(--fg-subtle)' }}>Пресеты</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {UI_GRADIENT_PRESETS.map(p => {
                                            const parsed = parseGradient2(p.value)
                                            return (
                                                <button
                                                    key={p.label}
                                                    onClick={() => { setGradFrom(parsed.from); setGradTo(parsed.to); setGradDir('135deg'); setGradCss('') }}
                                                    title={p.label}
                                                    className="flex flex-col items-center gap-0.5 group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg transition-all hover:scale-110 border"
                                                         style={{ background: p.value, borderColor: 'var(--border)' }} />
                                                    <span className="text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                          style={{ color: 'var(--fg-subtle)' }}>{p.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Конструктор */}
                                <div className="flex flex-col gap-2.5">
                                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>Конструктор (2 цвета)</p>
                                    <div>
                                        <p className="text-[9px] mb-1.5" style={{ color: 'var(--fg-subtle)' }}>Направление</p>
                                        <div className="flex gap-1 flex-wrap">
                                            {GRADIENT_DIRS.map(d => (
                                                <button
                                                    key={d.value}
                                                    onClick={() => { setGradDir(d.value); setGradCss('') }}
                                                    className="w-7 h-7 rounded-lg text-xs border transition-all hover:scale-105"
                                                    style={{
                                                        background:  gradDir === d.value ? 'var(--accent-bg)' : 'var(--surface-2)',
                                                        borderColor: gradDir === d.value ? 'var(--accent)' : 'var(--border)',
                                                        color:       gradDir === d.value ? 'var(--accent)' : 'var(--fg-muted)',
                                                    }}
                                                >
                                                    {d.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <ColorRow label="От" value={gradFrom} onChange={v => { setGradFrom(v); setGradCss('') }} />
                                    <ColorRow label="До" value={gradTo}   onChange={v => { setGradTo(v);   setGradCss('') }} />
                                </div>

                                {/* Свой CSS */}
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'var(--fg-subtle)' }}>
                                        Свой CSS <span style={{ fontWeight: 400 }}>(3+ стопа, webkit тоже)</span>
                                    </p>
                                    <textarea
                                        value={gradCss}
                                        onChange={e => setGradCss(e.target.value)}
                                        placeholder={`linear-gradient(90deg, #4a98f7, #2564b4, #04080c)`}
                                        rows={3}
                                        className="w-full rounded-lg px-3 py-1.5 text-[11px] font-mono outline-none resize-none"
                                        style={{
                                            background: 'var(--surface-2)',
                                            border: '1px solid var(--border)',
                                            color: 'var(--fg)',
                                        }}
                                    />
                                    {gradCss.trim() && (
                                        <p className="text-[9px] mt-1 font-mono truncate" style={{ color: 'var(--fg-subtle)' }}>
                                            → {normalizeGradientCss(gradCss)}
                                        </p>
                                    )}
                                </div>

                                {/* Превью + Apply */}
                                <div className="flex flex-col gap-2">
                                    <p className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--fg-subtle)' }}>Превью</p>
                                    <div className="w-full h-10 rounded-xl border"
                                         style={{ background: previewCss, borderColor: 'var(--border)' }} />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={applyUiGradient}
                                            disabled={gradTarget === 'custom' && (!customSelector.trim() || !!selectorError)}
                                            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
                                            style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                                        >
                                            Применить{gradTarget === 'custom' && selectorCount > 0 ? ` (${selectorCount})` : ''}
                                        </button>
                                        <button
                                            onClick={resetUiGradient}
                                            className="py-1.5 px-3 rounded-lg text-xs border transition-all hover:opacity-80"
                                            style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                                        >
                                            <RotateCcw size={11} />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── ColorRow ─────────────────────────────────────────────────────────────────
function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    const [local, setLocal] = useState(value)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => { setLocal(value) }, [value])

    const handleChange = (v: string) => {
        setLocal(v)
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => onChange(v), 80)
    }

    return (
        <div className="flex items-center gap-2.5">
            <span className="text-xs w-20 shrink-0" style={{ color: 'var(--fg-muted)' }}>{label}</span>
            <div className="relative w-7 h-7 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: 'var(--border-strong)' }}>
                <div className="w-full h-full" style={{ background: local }} />
                <input type="color" value={local} onChange={e => handleChange(e.target.value)}
                       className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
            <code className="text-[11px] font-mono" style={{ color: 'var(--fg-subtle)' }}>{local}</code>
        </div>
    )
}