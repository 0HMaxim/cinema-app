import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

// ─── Типы ────────────────────────────────────────────────────────
export type Lang = 'uk' | 'en' | 'ru'
export type Theme = 'light' | 'dark'

export interface GradientConfig {
    from: string
    to: string
}

const DEFAULT_GRADIENTS: Record<Theme, GradientConfig> = {
    light: { from: '#f0f4ff', to: '#fdf0ff' },
    dark:  { from: '#0d0f14', to: '#12101a' },
}

// ─── Переводы ────────────────────────────────────────────────────
const TRANSLATIONS: Record<Lang, Record<string, string>> = {
    uk: { search: 'Пошук фільмів...', login: 'Увійти' },
    en: { search: 'Search movies...',  login: 'Sign in' },
    ru: { search: 'Поиск фильмов...',  login: 'Войти'  },
}


// ─── Контекст ────────────────────────────────────────────────────
interface AppContextValue {
    lang: Lang
    setLang: (l: Lang) => void
    theme: Theme
    toggleTheme: () => void
    gradients: Record<Theme, GradientConfig>
    setGradient: (theme: Theme, config: GradientConfig) => void
    t: (key: string) => string
    selectedCinemaId: string | null
    setSelectedCinemaId: (id: string | null) => void
    orderId: string | null          // ← добавь
    setOrderId: (id: string | null) => void  // ← добавь
}

const AppContext = createContext<AppContextValue | null>(null)


export function AppProvider({ children }: { children: ReactNode }) {
    const [lang,  setLang]  = useState<Lang>(() =>
        (localStorage.getItem('lang') as Lang | null) ?? 'uk'
    )
    const [theme, setTheme] = useState<Theme>(() =>
        (localStorage.getItem('theme') as Theme | null) ?? 'dark'
    )
    const [gradients, setGradients] = useState<Record<Theme, GradientConfig>>(() => {
        try {
            const saved = localStorage.getItem('gradients')
            if (saved) return JSON.parse(saved)
        } catch {}
        return DEFAULT_GRADIENTS

    })

    const [orderId, setOrderId] = useState<string | null>(null)

    const [selectedCinemaId, setSelectedCinemaId] = useState<string | null>(
        () => localStorage.getItem('selectedCinemaId') ?? null
    )

    useEffect(() => {
        if (selectedCinemaId) localStorage.setItem('selectedCinemaId', selectedCinemaId)
        else localStorage.removeItem('selectedCinemaId')
    }, [selectedCinemaId])

    // Persist
    useEffect(() => { localStorage.setItem('lang',  lang)  }, [lang])
    useEffect(() => { localStorage.setItem('theme', theme) }, [theme])
    useEffect(() => { localStorage.setItem('gradients', JSON.stringify(gradients)) }, [gradients])

    // Применяем градиент текущей темы к CSS-переменным
    useEffect(() => {
        const root = document.documentElement
        const g = gradients[theme]
        root.style.setProperty('--bg-from', g.from)
        root.style.setProperty('--bg-to',   g.to)
    }, [theme, gradients])

    const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

    const setGradient = (t: Theme, config: GradientConfig) => {
        setGradients(prev => ({ ...prev, [t]: config }))
    }

    const translate = (key: string) => TRANSLATIONS[lang][key] ?? key

    return (
        <AppContext.Provider value={{ lang, setLang, theme, toggleTheme, gradients, setGradient, t: translate,
            selectedCinemaId,
            setSelectedCinemaId,
            orderId, setOrderId,
        }}>
            {children}
        </AppContext.Provider>
    )
}

export function useApp() {
    const ctx = useContext(AppContext)
    if (!ctx) throw new Error('useApp must be used inside AppProvider')
    return ctx
}