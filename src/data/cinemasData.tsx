// ─── Типы ─────────────────────────────────────────────────────────────────────

export interface Hall {
    id: string
    name: string
    capacity: number
    formats: string[]
}

export interface Session {
    time: string
    format: string
    hallId: string
}

export interface CinemaMovie {
    tmdbId: number
    title: string
    posterPath: string | null
    ageRating: string
    sessions: Session[]
}

export interface Technology {
    id: string
    name: string
    description: string
    icon: string
}

export interface Photo {
    url: string
    alt: string
}

export type ComfortTag =
    | 'Easy pass' | 'VIP' | 'LUX' | 'Місця для людей з інвалідністю'
    | 'Турнікети' | 'Chill out'

export type ContentTag = 'Theatre HD' | 'Футбол' | 'Original voice'

export type ServiceTag =
    | 'M cafe' | 'Замовлення в залі' | 'Оренда залу' | 'Фотокабінка'
    | 'Ігрові автомати' | 'MClub' | 'Дитяча кімната'

export type TechTag = 'TWINS' | 'IMAX' | 'LASER' | 'ScreenX'

export interface Cinema {
    id: string
    name: string
    city: string
    address: string
    phone: string
    heroImage: string
    photo: string                 // thumbnail для списка
    comfort: ComfortTag[]
    content: ContentTag[]
    services: ServiceTag[]
    techs: TechTag[]
    halls: Hall[]
    movies: CinemaMovie[]
    technologies: Technology[]
    photos: Photo[]
    lat: number
    lng: number
}

// ─── Технологии (общий справочник) ────────────────────────────────────────────

export const TECH_INFO: Technology[] = [
    { id: '2d',    name: '2D',             icon: '🎞',  description: 'Класичний формат без спецефектів.' },
    { id: '3d',    name: '3D',             icon: '🥽',  description: 'Об\'ємне зображення для прихильників видовищних спецефектів.' },
    { id: 'imax3', name: 'IMAX Лазер 3D',  icon: '✨',  description: 'Найсильніший ефект присутності та занурення.' },
    { id: 'imax2', name: 'IMAX Лазер 2D',  icon: '🔆',  description: 'Ефект присутності та занурення без окулярів.' },
    { id: 'atmos', name: 'Atmos',          icon: '🔊',  description: '64 канали звуку для ефекту присутності.' },
    { id: 'lux',   name: 'LUX',            icon: '🛋',  description: 'Крісла-реклайнери для підвищеного комфорту.' },
    { id: 'uasub', name: 'UaSUB',          icon: '🇺🇦', description: 'Сеанс з українськими субтитрами.' },
    { id: 'sdh',   name: 'SDH',            icon: '♿',  description: 'Субтитри для осіб з порушеннями слуху.' },
    { id: 'screenx', name: 'ScreenX',      icon: '🖥',  description: 'Трициліндровий екран — кіно на 270°.' },
    { id: 'laser', name: 'LASER',          icon: '💡',  description: 'Лазерна проекція для максимальної чіткості.' },
]

// ─── Дані ─────────────────────────────────────────────────────────────────────

export const CINEMAS: Cinema[] = [
    {
        id: 'lavina',
        name: 'Lavina IMAX Лазер',
        city: 'Київ',
        address: 'вул. Берковецька, 6Д',
        phone: '0 800 300 000',
        heroImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1400&q=80',
        photo: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
        comfort: ['LUX', 'Easy pass', 'Місця для людей з інвалідністю'],
        content: ['Theatre HD', 'Футбол', 'Original voice'],
        services: ['MClub', 'Оренда залу', 'Замовлення в залі'],
        techs: ['IMAX', 'LASER'],
        halls: [
            { id: 'h1', name: 'IMAX Лазер', capacity: 320, formats: ['IMAX L 3D', 'IMAX L 2D'] },
            { id: 'h2', name: 'Atmos LUX',  capacity: 120, formats: ['ATMOS LUX'] },
            { id: 'h3', name: 'Зал 3',      capacity: 90,  formats: ['SDH', '2D'] },
            { id: 'h4', name: 'Зал 4',      capacity: 90,  formats: ['SDH', '2D'] },
        ],
        movies: [
            {
                tmdbId: 950387,
                title: 'Дуже страшне кіно',
                posterPath: null,
                ageRating: '18+',
                sessions: [
                    { time: '10:10', format: 'SDH',       hallId: 'h3' },
                    { time: '11:20', format: 'SDH',       hallId: 'h3' },
                    { time: '12:20', format: 'SDH',       hallId: 'h4' },
                    { time: '13:30', format: 'LUX SDH',   hallId: 'h2' },
                    { time: '15:40', format: 'LUX SDH',   hallId: 'h2' },
                    { time: '17:50', format: 'LUX SDH',   hallId: 'h2' },
                    { time: '20:00', format: 'LUX SDH',   hallId: 'h2' },
                    { time: '21:00', format: 'SDH',       hallId: 'h3' },
                ],
            },
            {
                tmdbId: 1197306,
                title: 'День істини',
                posterPath: null,
                ageRating: '12+',
                sessions: [
                    { time: '10:30', format: 'IMAX L 2D', hallId: 'h1' },
                    { time: '13:00', format: 'ATMOS LUX', hallId: 'h2' },
                    { time: '13:30', format: 'IMAX L 3D', hallId: 'h1' },
                    { time: '16:00', format: 'ATMOS LUX', hallId: 'h2' },
                    { time: '16:30', format: 'IMAX L 3D', hallId: 'h1' },
                    { time: '19:00', format: 'ATMOS LUX', hallId: 'h2' },
                    { time: '19:30', format: 'IMAX L 2D', hallId: 'h1' },
                ],
            },
            {
                tmdbId: 1233069,
                title: 'Обсесія',
                posterPath: null,
                ageRating: '18+',
                sessions: [
                    { time: '11:20', format: 'LUX SDH',  hallId: 'h2' },
                    { time: '13:40', format: 'SDH',      hallId: 'h4' },
                    { time: '16:00', format: 'LUX SDH',  hallId: 'h2' },
                    { time: '18:20', format: 'SDH',      hallId: 'h4' },
                    { time: '20:40', format: 'SDH',      hallId: 'h3' },
                ],
            },
            {
                tmdbId: 1084736,
                title: 'Брудні Гроші',
                posterPath: null,
                ageRating: '16+',
                sessions: [
                    { time: '10:10', format: 'SDH',      hallId: 'h3' },
                    { time: '12:50', format: 'SDH',      hallId: 'h4' },
                    { time: '14:40', format: 'SDH',      hallId: 'h3' },
                    { time: '15:10', format: 'LUX SDH',  hallId: 'h2' },
                    { time: '17:30', format: 'LUX SDH',  hallId: 'h2' },
                    { time: '19:45', format: 'SDH',      hallId: 'h4' },
                ],
            },
        ],
        technologies: TECH_INFO.filter(t => ['imax3','imax2','atmos','lux','sdh','uasub'].includes(t.id)),
        photos: [
            { url: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=800&q=80', alt: 'IMAX зал' },
            { url: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&q=80', alt: 'Зал LUX' },
            { url: 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=800&q=80', alt: 'Фойє' },
            { url: 'https://images.unsplash.com/photo-1485095329183-d0797cdc5676?w=800&q=80', alt: 'Каса' },
            { url: 'https://images.unsplash.com/photo-1460881680858-30d872d5b530?w=800&q=80', alt: 'Екран' },
            { url: 'https://images.unsplash.com/photo-1542204165-65bf26472b9b?w=800&q=80', alt: 'Крісла' },
        ],
        lat: 50.4847,
        lng: 30.3861,
    },

    {
        id: 'respublika',
        name: 'Respublika Park IMAX',
        city: 'Київ',
        address: 'Кільцева дорога, 1',
        phone: '0 800 300 001',
        heroImage: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1400&q=80',
        photo: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80',
        comfort: ['LUX', 'VIP', 'Easy pass', 'Chill out', 'Місця для людей з інвалідністю'],
        content: ['Theatre HD', 'Футбол', 'Original voice'],
        services: ['Оренда залу', 'M cafe'],
        techs: ['IMAX', 'LASER', 'ScreenX'],
        halls: [
            { id: 'h1', name: 'IMAX Лазер',  capacity: 380, formats: ['IMAX L 3D', 'IMAX L 2D'] },
            { id: 'h2', name: 'LUX SDH',     capacity: 100, formats: ['LUX SDH'] },
            { id: 'h3', name: 'ScreenX',     capacity: 200, formats: ['ScreenX'] },
            { id: 'h4', name: 'Chill out',   capacity: 50,  formats: ['CHILL OUT'] },
            { id: 'h5', name: 'VIP',         capacity: 30,  formats: ['VIP'] },
        ],
        movies: [
            {
                tmdbId: 1197306,
                title: 'День істини',
                posterPath: null,
                ageRating: '12+',
                sessions: [
                    { time: '10:30', format: 'IMAX L 2D', hallId: 'h1' },
                    { time: '11:10', format: 'LUX SDH',   hallId: 'h2' },
                    { time: '13:30', format: 'IMAX L 2D', hallId: 'h1' },
                    { time: '16:30', format: 'IMAX L 2D', hallId: 'h1' },
                    { time: '19:30', format: 'IMAX L 2D', hallId: 'h1' },
                    { time: '20:10', format: 'LUX SDH',   hallId: 'h2' },
                ],
            },
            {
                tmdbId: 950387,
                title: 'Дуже страшне кіно',
                posterPath: null,
                ageRating: '18+',
                sessions: [
                    { time: '10:00', format: 'ScreenX',   hallId: 'h3' },
                    { time: '13:00', format: 'ScreenX',   hallId: 'h3' },
                    { time: '16:00', format: 'ScreenX',   hallId: 'h3' },
                    { time: '19:00', format: 'ScreenX',   hallId: 'h3' },
                ],
            },
            {
                tmdbId: 1233069,
                title: 'Обсесія',
                posterPath: null,
                ageRating: '18+',
                sessions: [
                    { time: '10:30', format: 'CHILL OUT', hallId: 'h4' },
                    { time: '13:30', format: 'CHILL OUT', hallId: 'h4' },
                    { time: '17:00', format: 'CHILL OUT', hallId: 'h4' },
                    { time: '20:00', format: 'CHILL OUT', hallId: 'h4' },
                ],
            },
            {
                tmdbId: 762509,
                title: 'Муфаса: Король Лев',
                posterPath: null,
                ageRating: '0+',
                sessions: [
                    { time: '10:00', format: 'IMAX L 3D', hallId: 'h1' },
                    { time: '12:30', format: 'IMAX L 3D', hallId: 'h1' },
                    { time: '15:00', format: 'LUX SDH',   hallId: 'h2' },
                    { time: '18:00', format: 'VIP',       hallId: 'h5' },
                ],
            },
            {
                tmdbId: 1084736,
                title: 'Брудні Гроші',
                posterPath: null,
                ageRating: '16+',
                sessions: [
                    { time: '11:30', format: 'LUX SDH',  hallId: 'h2' },
                    { time: '14:30', format: 'LUX SDH',  hallId: 'h2' },
                    { time: '17:30', format: 'VIP',      hallId: 'h5' },
                    { time: '20:30', format: 'LUX SDH',  hallId: 'h2' },
                ],
            },
        ],
        technologies: TECH_INFO.filter(t => ['imax3','imax2','screenx','lux','laser','sdh'].includes(t.id)),
        photos: [
            { url: 'https://images.unsplash.com/photo-1563237023-b1e970526dcb?w=800&q=80', alt: 'Зал IMAX' },
            { url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=800&q=80', alt: 'ScreenX' },
            { url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80', alt: 'VIP зал' },
            { url: 'https://images.unsplash.com/photo-1595769816263-9b910be24d5f?w=800&q=80', alt: 'Фойє' },
        ],
        lat: 50.3521,
        lng: 30.4978,
    },
]