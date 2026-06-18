// src/pages/cart/Checkout.tsx

import { useMemo, useState} from 'react'

interface SelectedSeat {
    row: number
    seat: number
    category: string
    price: number
    label: string
}

export default function Checkout() {

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'applepay'>('card')

    const cart = useMemo(() => {
        const raw = sessionStorage.getItem('cart_seats')
        if (!raw) return null

        return JSON.parse(raw) as {
            cinemaId: string
            sessionId: string
            seats: SelectedSeat[]
        }
    }, [])


    const concessions = useMemo(() => {
        const raw = sessionStorage.getItem(
            "cart_concessions"
        )

        return raw
            ? JSON.parse(raw)
            : []
    }, [])



    const total = cart?.seats.reduce(
        (sum, seat) => sum + seat.price,
        0
    ) ?? 0

    async function handleContinue() {
        if (!name || !email || !phone) {
            alert('Заповніть усі поля')
            return
        }

        sessionStorage.setItem(
            'checkout',
            JSON.stringify({
                customer: {
                    name,
                    email,
                    phone,
                },
                paymentMethod,
            })
        )

        console.log('ready for payment')

        // потом сюда подключишь Firebase
        // navigate(`/cart/${orderId}/success`)
    }

    if (!cart) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                Замовлення не знайдено
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="grid lg:grid-cols-[1fr_350px] gap-6">

                {/* Customer */}

                <div className="space-y-6">

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h1 className="text-2xl font-bold mb-6">
                            Дані покупця
                        </h1>

                        <div className="space-y-4">

                            <input
                                type="text"
                                placeholder="Ім'я"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                            />

                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                            />

                            <input
                                type="tel"
                                placeholder="Телефон"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3"
                            />

                        </div>
                    </div>

                    {/* Payment */}

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <h2 className="text-lg font-semibold mb-4">
                            Спосіб оплати
                        </h2>

                        <div className="space-y-3">

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={paymentMethod === 'card'}
                                    onChange={() => setPaymentMethod('card')}
                                />
                                Банківська карта
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="radio"
                                    checked={paymentMethod === 'applepay'}
                                    onChange={() => setPaymentMethod('applepay')}
                                />
                                Apple Pay
                            </label>

                        </div>
                    </div>

                </div>

                {/* Summary */}

                <div className="lg:sticky lg:top-20 h-fit">

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">

                        <h2 className="text-lg font-semibold mb-4">
                            Ваше замовлення
                        </h2>

                        {/* Tickets */}

                        <div className="space-y-2 mb-4">

                            {cart.seats.map((seat) => (
                                <div
                                    key={`${seat.row}_${seat.seat}`}
                                    className="flex justify-between text-sm"
                                >
                                    <span>{seat.label}</span>
                                    <span>{seat.price} ₴</span>
                                </div>
                            ))}

                        </div>

                        {/* Concessions */}

                        {concessions.length > 0 && (
                            <>
                                <div className="border-t border-white/10 my-4" />

                                <div className="space-y-2 mb-4">

                                    {concessions.map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="flex justify-between text-sm"
                                        >
                            <span>
                                {item.name} × {item.quantity}
                            </span>

                                            <span>
                                {item.price * item.quantity} ₴
                            </span>
                                        </div>
                                    ))}

                                </div>
                            </>
                        )}

                        <div className="border-t border-white/10 pt-4 flex justify-between font-bold text-lg">

                            <span>Разом</span>

                            <span>
                {
                    total +
                    concessions.reduce(
                        (sum: number, item: any) =>
                            sum + item.price * item.quantity,
                        0
                    )
                } ₴
            </span>

                        </div>

                        <button
                            onClick={handleContinue}
                            className="w-full mt-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 transition-colors font-semibold"
                        >
                            Перейти до оплати
                        </button>

                    </div>

                </div>

                </div>

            </div>
    )
}