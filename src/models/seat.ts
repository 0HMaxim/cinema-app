export type SeatCategory = 'STANDARD' | 'LUX' | 'SUPER_LUX' | 'CHILL_OUT' | 'VIP'


export interface Seat {
    row: number
    seat: number
    category: SeatCategory
    price: number
}