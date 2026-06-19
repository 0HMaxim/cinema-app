// src/models/cart.ts

export interface CartSessionInfo {
    movieTitle: string
    cinemaName: string
    hallName:   string
    date:       string
    time:       string
    endTime?:   string | null
    format:     string
    backHref:   string
}