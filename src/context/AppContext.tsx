// AppContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type {Cinema} from "../models/cinema.ts";
import {collection, getDocs} from "firebase/firestore";
import {db} from "../firebase.ts";

export type Lang = 'uk' | 'en' | 'ru'
export type Theme = 'light' | 'dark'

export interface GradientConfig {
    from: string
    to: string
}

export interface ThemeColors {
    accent: string
    surface: string
    surface2: string
    fg: string
    fgMuted: string
}

const DEFAULT_COLORS: Record<Theme, ThemeColors> = {
    light: {
        accent:   '#facc15',
        surface:  '#ffffff',
        surface2: '#f1f3f8',
        fg:       '#0f1117',
        fgMuted:  '#6b7280',
    },
    dark: {
        accent:   '#facc15',
        surface:  '#16181f',
        surface2: '#1e2029',
        fg:       '#f0f2f8',
        fgMuted:  '#8b93a8',
    },
}

const DEFAULT_GRADIENTS: Record<Theme, GradientConfig> = {
    light: { from: '#f0f4ff', to: '#fdf0ff' },
    dark:  { from: '#0d0f14', to: '#12101a' },
}

interface AppCity { id: string; key: string; names: Record<string, string> }

// 1. Добавь в TRANSLATIONS недостающие ключи
const TRANSLATIONS: Record<Lang, Record<string, string>> = {
    uk: {
        search: 'Пошук фільмів...', searchNotFound: 'Нічого не знайдено',
        login: 'Увійти', admin: 'Адмін', chooseCinema: 'Обрати кінотеатр', menu: 'Меню',
        home: 'Головна',
        // WelcomePicker / CinemaPickerPanel
        cinemaPickerTitle: 'Кінотеатр',
        cinemaPickerSub:   'Оберіть місто та кінотеатр',
        cinemaPickerGo:    'Перейти до кінотеатру',
        cinemaNotFound:    'Кінотеатрів не знайдено',
        welcomeTitle:      'Оберіть кінотеатр',
        welcomeSub:        'Щоб бачити актуальні сеанси поруч',
        skip:              'Пропустити',
        confirm:           'Готово',
        // Home
        noCinemas:         'Кінотеатрів поки немає',
        cityAll:           'Всі міста',
        seedChooseCountry:  'Оберіть країну',
        seedSearchCountry:  'Пошук країни…',
        seedCitiesOf:       'Міста',
        seedChooseCities:   'Оберіть міста для сиду',
        seedMinCities:      'Оберіть хоча б одне місто',
        seedStartSeed:      'Запустити сид',
        seedCancel:         'Скасувати',
        seedSelectAll:      'Вибрати всі',
        seedDeselectAll:    'Зняти всі',
        seedLoading:        'Завантаження міст…',
        seedDone:           'Готово',
        seedClose:          'Закрити',
        // BurgerMenu
        navHome:            'Головна',
        navMovies:          'Фільми',
        navCinemas:         'Кінотеатри',
        navPromotions:      'Акції',
        navAbout:           'Про нас',
        navAdmin:           'Адмін',
        menuOpen:           'Відкрити меню',
        menuClose:          'Закрити меню',
        menuNav:            'Навігаційне меню',
    },
    en: {
        search: 'Search movies...', searchNotFound: 'Nothing found',
        login: 'Sign in', admin: 'admin', chooseCinema: 'Choose cinema', menu: 'Menu',
        home: 'Home',
        cinemaPickerTitle: 'Cinema',
        cinemaPickerSub:   'Choose city and cinema',
        cinemaPickerGo:    'Go to cinema',
        cinemaNotFound:    'No cinemas found',
        welcomeTitle:      'Choose a cinema',
        welcomeSub:        'To see sessions near you',
        skip:              'Skip',
        confirm:           'Done',
        noCinemas:         'No cinemas yet',
        cityAll:           'All cities',
        seedChooseCountry:  'Choose a country',
        seedSearchCountry:  'Search country…',
        seedCitiesOf:       'Cities',
        seedChooseCities:   'Choose cities to seed',
        seedMinCities:      'Choose at least one city',
        seedStartSeed:      'Start seed',
        seedCancel:         'Cancel',
        seedSelectAll:      'Select all',
        seedDeselectAll:    'Deselect all',
        seedLoading:        'Loading cities…',
        seedDone:           'Done',
        seedClose:          'Close',
        // BurgerMenu
        navHome:            'Home',
        navMovies:          'Movies',
        navCinemas:         'Cinemas',
        navPromotions:      'Promotions',
        navAbout:           'About',
        navAdmin:           'Admin',
        menuOpen:           'Open menu',
        menuClose:          'Close menu',
        menuNav:            'Navigation menu',
    },
    ru: {
        search: 'Поиск фильмов...', searchNotFound: 'Ничего не найдено',
        login: 'Войти', admin: 'Админ', chooseCinema: 'Выбрать кинотеатр', menu: 'Меню',
        home: 'Главная',
        cinemaPickerTitle: 'Кинотеатр',
        cinemaPickerSub:   'Выберите город и кинотеатр',
        cinemaPickerGo:    'Перейти к кинотеатру',
        cinemaNotFound:    'Кинотеатров не найдено',
        welcomeTitle:      'Выберите кинотеатр',
        welcomeSub:        'Чтобы видеть актуальные сеансы рядом',
        skip:              'Пропустить',
        confirm:           'Готово',
        noCinemas:         'Кинотеатров пока нет',
        cityAll:           'Все города',
        seedChooseCountry:  'Выберите страну',
        seedSearchCountry:  'Поиск страны…',
        seedCitiesOf:       'Города',
        seedChooseCities:   'Выберите города для сида',
        seedMinCities:      'Выберите хотя бы один город',
        seedStartSeed:      'Запустить сид',
        seedCancel:         'Отмена',
        seedSelectAll:      'Выбрать все',
        seedDeselectAll:    'Снять все',
        seedLoading:        'Загрузка городов…',
        seedDone:           'Готово',
        seedClose:          'Закрыть',
        // BurgerMenu
        navHome:            'Главная',
        navMovies:          'Фильмы',
        navCinemas:         'Кинотеатры',
        navPromotions:      'Акции',
        navAbout:           'О нас',
        navAdmin:           'Админ',
        menuOpen:           'Открыть меню',
        menuClose:          'Закрыть меню',
        menuNav:            'Навигационное меню',
    },
}

interface AppContextValue {
    lang: Lang; setLang: (l: Lang) => void
    theme: Theme; toggleTheme: () => void
    gradients: Record<Theme, GradientConfig>
    setGradient: (theme: Theme, config: GradientConfig) => void
    colors: Record<Theme, ThemeColors>
    setColor: (theme: Theme, colors: Partial<ThemeColors>) => void
    resetColors: (theme: Theme) => void
    t: (key: string) => string
    selectedCinemaId: string | null
    setSelectedCinemaId: (id: string | null) => void
    orderId: string | null
    setOrderId: (id: string | null) => void
    isThemeChanging: boolean
    showWelcome: boolean
    setShowWelcome: (v: boolean) => void,
    cinemas: Cinema[]
    cinemasLoading: boolean
    tCity: (cityKey: string) => string
    applyPreset: (preset: ThemePreset) => void
}

// В AppContext.tsx — добавь после DEFAULT_COLORS

export interface ThemePreset {
    id: string
    label: string
    theme: Theme
    gradient: GradientConfig
    colors: ThemeColors
}

export const THEME_PRESETS: ThemePreset[] = [
    // ─── Светлые ──────────────────────────────────────────────
    {
        id: 'light-default',
        label: 'Снег',
        theme: 'light',
        gradient: { from: '#f0f4ff', to: '#fdf0ff' },
        colors: {
            accent: '#facc15', surface: '#ffffff', surface2: '#f1f3f8',
            fg: '#0f1117', fgMuted: '#6b7280',
        },
    },
    {
        id: 'light-rose',
        label: 'Роза',
        theme: 'light',
        gradient: { from: '#fff0f5', to: '#fce7f3' },
        colors: {
            accent: '#f43f5e', surface: '#ffffff', surface2: '#fdf2f5',
            fg: '#1a0a0e', fgMuted: '#9f6b7a',
        },
    },
    {
        id: 'light-ocean',
        label: 'Океан',
        theme: 'light',
        gradient: { from: '#e0f2fe', to: '#f0fdf4' },
        colors: {
            accent: '#0ea5e9', surface: '#ffffff', surface2: '#f0f9ff',
            fg: '#0a1628', fgMuted: '#4a7a9b',
        },
    },
    {
        id: 'light-forest',
        label: 'Лес',
        theme: 'light',
        gradient: { from: '#f0fdf4', to: '#ecfdf5' },
        colors: {
            accent: '#10b981', surface: '#ffffff', surface2: '#f0fdf4',
            fg: '#0a1f14', fgMuted: '#4a7a62',
        },
    },
    {
        id: 'light-sunset',
        label: 'Закат',
        theme: 'light',
        gradient: { from: '#fff7ed', to: '#fef2f2' },
        colors: {
            accent: '#f97316', surface: '#ffffff', surface2: '#fff7ed',
            fg: '#1c0a00', fgMuted: '#9a6040',
        },
    },

    // ─── Тёмные ───────────────────────────────────────────────
    {
        id: 'dark-default',
        label: 'Космос',
        theme: 'dark',
        gradient: { from: '#0d0f14', to: '#12101a' },
        colors: {
            accent: '#facc15', surface: '#16181f', surface2: '#1e2029',
            fg: '#f0f2f8', fgMuted: '#8b93a8',
        },
    },
    {
        id: 'dark-crimson',
        label: 'Кровь',
        theme: 'dark',
        gradient: { from: '#110508', to: '#1a0a10' },
        colors: {
            accent: '#f43f5e', surface: '#1a0c10', surface2: '#240f15',
            fg: '#f8e8ec', fgMuted: '#a07080',
        },
    },
    {
        id: 'dark-abyss',
        label: 'Бездна',
        theme: 'dark',
        gradient: { from: '#060810', to: '#0c0e1a' },
        colors: {
            accent: '#818cf8', surface: '#0e1020', surface2: '#151828',
            fg: '#e8eaff', fgMuted: '#6672b0',
        },
    },
    {
        id: 'dark-forest',
        label: 'Таёжник',
        theme: 'dark',
        gradient: { from: '#05100a', to: '#091510' },
        colors: {
            accent: '#34d399', surface: '#0c1810', surface2: '#121f16',
            fg: '#e0f4ec', fgMuted: '#5a9070',
        },
    },
    {
        id: 'dark-copper',
        label: 'Медь',
        theme: 'dark',
        gradient: { from: '#100d08', to: '#1a1208' },
        colors: {
            accent: '#fb923c', surface: '#1c1408', surface2: '#251c0c',
            fg: '#f5ede0', fgMuted: '#a07840',
        },
    },
]

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
    const [lang, setLang] = useState<Lang>(() => (localStorage.getItem('lang') as Lang) ?? 'uk')
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) ?? 'dark')
    const [gradients, setGradients] = useState<Record<Theme, GradientConfig>>(() => {
        try { const s = localStorage.getItem('gradients'); if (s) return JSON.parse(s) } catch {}
        return DEFAULT_GRADIENTS
    })
    const [colors, setColors] = useState<Record<Theme, ThemeColors>>(() => {
        try { const s = localStorage.getItem('themeColors'); if (s) return JSON.parse(s) } catch {}
        return DEFAULT_COLORS
    })
    const [orderId, setOrderId] = useState<string | null>(null)

    const [isThemeChanging, setIsThemeChanging] = useState(false)

    const [selectedCinemaId, setSelectedCinemaIdRaw] = useState<string | null>(
        () => localStorage.getItem('selectedCinemaId')
    )

    const [showWelcome, setShowWelcome] = useState(  // ← добавь это
        () => !localStorage.getItem('selectedCinemaId')
    )
    const [appCities, setAppCities] = useState<AppCity[]>([])

    useEffect(() => {
        getDocs(collection(db, 'cities')).then(snap => {
            setAppCities(snap.docs.map(d => ({ id: d.id, ...d.data() } as AppCity)))
        })
    }, [])

    const tCity = (cityKey: string): string => {
        const city = appCities.find(c => c.key === cityKey)
        if (!city) return cityKey
        return city.names[lang] || city.names['uk'] || cityKey
    }

    const [cinemas, setCinemas] = useState<Cinema[]>([])
    const [cinemasLoading, setCinemasLoading] = useState(false)

    useEffect(() => {
        setCinemasLoading(true)
        getDocs(collection(db, 'cinemas')).then(snap => {
            setCinemas(snap.docs.map(d => ({
                id: d.id,
                name: (d.data() as any).name ?? '',
                city: (d.data() as any).city ?? '',
                cityKey: (d.data() as any).cityKey ?? '',
                address: (d.data() as any).address ?? '',
            })))
        }).finally(() => setCinemasLoading(false))
    }, [])

    const applyPreset = (preset: ThemePreset) => {
        setIsThemeChanging(true)
        setTheme(preset.theme)
        setGradients(prev => ({ ...prev, [preset.theme]: preset.gradient }))
        setColors(prev => ({ ...prev, [preset.theme]: preset.colors }))
        setTimeout(() => setIsThemeChanging(false), 350)
    }

    const setSelectedCinemaId = (id: string | null) => {
        setSelectedCinemaIdRaw(id)
    }

    useEffect(() => {
        if (selectedCinemaId) localStorage.setItem('selectedCinemaId', selectedCinemaId)
        else localStorage.removeItem('selectedCinemaId')
    }, [selectedCinemaId])

    useEffect(() => { localStorage.setItem('lang', lang) }, [lang])
    useEffect(() => { localStorage.setItem('theme', theme) }, [theme])
    useEffect(() => { localStorage.setItem('gradients', JSON.stringify(gradients)) }, [gradients])
    useEffect(() => { localStorage.setItem('themeColors', JSON.stringify(colors)) }, [colors])

    useEffect(() => {
        const root = document.documentElement
        root.classList.toggle('dark', theme === 'dark')
        root.classList.toggle('light', theme === 'light')
    }, [theme])

    // Применяем все переменные при смене темы или цветов
    useEffect(() => {
        const root = document.documentElement
        const g = gradients[theme]
        const c = colors[theme]
        root.style.removeProperty('--bg-gradient')
        root.style.setProperty('--bg-from', g.from)
        root.style.setProperty('--bg-to', g.to)
        root.style.setProperty('--accent', c.accent)
        // accent-fg: чёрный для светлых акцентов, белый для тёмных
        const hex = c.accent.replace('#', '')
        const r = parseInt(hex.slice(0,2),16), g2 = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
        const luminance = (0.299*r + 0.587*g2 + 0.114*b) / 255
        root.style.setProperty('--accent-fg', luminance > 0.5 ? '#000000' : '#ffffff')
        root.style.setProperty('--accent-hover', c.accent)
        root.style.setProperty('--surface', c.surface)
        root.style.setProperty('--surface-2', c.surface2)
        root.style.setProperty('--fg', c.fg)
        root.style.setProperty('--fg-muted', c.fgMuted)
    }, [theme, gradients, colors])

    const toggleTheme = () => {
        setIsThemeChanging(true)
        setTheme(t => t === 'dark' ? 'light' : 'dark')
        setTimeout(() => setIsThemeChanging(false), 350)
    }
    const setGradient = (t: Theme, config: GradientConfig) =>
        setGradients(prev => ({ ...prev, [t]: config }))

    const setColor = (t: Theme, partial: Partial<ThemeColors>) => {
        setIsThemeChanging(true)
        setColors(prev => ({ ...prev, [t]: { ...prev[t], ...partial } }))
        setTimeout(() => setIsThemeChanging(false), 150)
    }
    const resetColors = (t: Theme) =>
        setColors(prev => ({ ...prev, [t]: DEFAULT_COLORS[t] }))

    const translate = (key: string) => TRANSLATIONS[lang][key] ?? key

    return (
        <AppContext.Provider value={{
            lang, setLang, theme, toggleTheme,
            gradients, setGradient,
            colors, setColor, resetColors,
            t: translate,
            selectedCinemaId, setSelectedCinemaId,
            orderId, setOrderId,
            isThemeChanging,
            showWelcome, setShowWelcome,
            cinemas, cinemasLoading,
            tCity,
            applyPreset,
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