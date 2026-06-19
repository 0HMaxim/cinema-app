// src/pages/cart/Checkout.tsx

import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase.ts'
import type { Order } from '../../models/order.ts'
import CartLayout from "../../layouts/CartPageLayout.tsx";

interface SelectedSeat {
    row: number; seat: number; category: string; price: number; label: string
}

export default function Checkout() {
    const { orderId } = useParams()
    const navigate    = useNavigate()

    const [name,          setName]          = useState('')
    const [email,         setEmail]         = useState('')
    const [phone,         setPhone]         = useState('')
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'applepay'>('card')
    const [saving,        setSaving]        = useState(false)

    const cart = useMemo(() => {
        const raw = sessionStorage.getItem('cart_seats')
        return raw
            ? JSON.parse(raw) as { cinemaId: string; sessionId: string; seats: SelectedSeat[] }
            : null
    }, [])

    const concessions = useMemo(() => {
        const raw = sessionStorage.getItem('cart_concessions')
        return raw ? JSON.parse(raw) : []
    }, [])

    const sessionMeta = useMemo(() => {
        const raw = sessionStorage.getItem('cart_session_meta')
        return raw ? JSON.parse(raw) : null
    }, [])

    const ticketsTotal  = cart?.seats.reduce((sum, s) => sum + s.price, 0) ?? 0
    const snacksTotal   = concessions.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0)
    const grandTotal    = ticketsTotal + snacksTotal

    async function handleContinue() {
        if (!name || !email || !phone) { alert('Заповніть усі поля'); return }
        if (!cart) return

        setSaving(true)
        try {
            const orderId_ = crypto.randomUUID()

            const order: Order = {
                id:            orderId_,
                cinemaId:      cart.cinemaId,
                sessionId:     cart.sessionId,
                customer:      { name, email, phone },
                tickets:       cart.seats.map(s => ({
                    row:      s.row,
                    seat:     s.seat,
                    category: s.category as any,
                    price:    s.price,
                })),
                concessions:   concessions,
                total:         grandTotal,
                paymentMethod,
                status:        'pending',
                createdAt:     Date.now(),
            }

            await setDoc(doc(db, 'orders', orderId_), order)

            // Чистимо кошик
            sessionStorage.removeItem('cart_seats')
            sessionStorage.removeItem('cart_concessions')
            sessionStorage.removeItem('cart_session_meta')

            navigate(`/cart/${orderId_}/success`)
        } catch (e) {
            console.error(e)
            alert('Помилка збереження замовлення')
        } finally {
            setSaving(false)
        }
    }

    if (!cart) return (
        <div className="max-w-4xl mx-auto p-6 text-center text-zinc-500">
            Замовлення не знайдено
        </div>
    )

    const sidebarContent = (
        <>
            {cart.seats.map(seat => (
                <div key={`${seat.row}_${seat.seat}`}
                     className="flex justify-between text-sm py-1 border-b border-white/5">
                    <span className="font-mono font-semibold">{seat.label}</span>
                    <span className="text-zinc-300">{seat.price}₴</span>
                </div>
            ))}
            {concessions.length > 0 && (
                <>
                    <div className="border-t border-white/10 my-2" />
                    {concessions.map((item: any) => (
                        <div key={item.id}
                             className="flex justify-between text-sm py-1 border-b border-white/5">
                            <span className="text-zinc-300">{item.name} × {item.quantity}</span>
                            <span className="text-zinc-300">{item.price * item.quantity}₴</span>
                        </div>
                    ))}
                </>
            )}
        </>
    )

    const sessionInfo = {
        movieTitle: sessionMeta?.movieTitle ?? '—',
        cinemaName: sessionMeta?.cinemaName ?? '—',
        hallName:   sessionMeta?.hallName   ?? '—',
        date:       sessionMeta?.date       ?? '—',
        time:       sessionMeta?.time       ?? '—',
        endTime:    sessionMeta?.endTime    ?? null,
        format:     sessionMeta?.format     ?? '—',
        backHref:   `/cart/${orderId}/concession`,
    }

    return (
        <CartLayout
            session={sessionInfo}
            sidebar={{
                content:     sidebarContent,
                total:       grandTotal,
                ctaLabel:    saving ? 'Збереження...' : 'Перейти до оплати',
                onCta:       handleContinue,
                ctaDisabled: !name || !email || !phone || saving,
            }}
        >


            <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
                    <h1 className="text-lg font-bold">Дані покупця</h1>
                    <input
                        type="text" placeholder="Ім'я" value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/30 transition-colors"
                    />
                    <input
                        type="email" placeholder="Email" value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/30 transition-colors"
                    />
                    <input
                        type="tel" placeholder="Телефон" value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-white/30 transition-colors"
                    />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-3">
                    <h2 className="text-lg font-semibold">Спосіб оплати</h2>

                    <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-red-600/60 bg-red-600/10' : 'border-white/10 hover:border-white/20'}`}>
                        <input type="radio" className="accent-red-600"
                               checked={paymentMethod === 'card'}
                               onChange={() => setPaymentMethod('card')} />
                        <div>
                            <p className="text-sm font-semibold">Банківська карта</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Visa, Mastercard</p>
                        </div>
                        <span className="ml-auto text-xl">💳</span>
                    </label>

                    <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${paymentMethod === 'applepay' ? 'border-red-600/60 bg-red-600/10' : 'border-white/10 hover:border-white/20'}`}>
                        <input type="radio" className="accent-red-600"
                               checked={paymentMethod === 'applepay'}
                               onChange={() => setPaymentMethod('applepay')} />
                        <div>
                            <p className="text-sm font-semibold">Apple Pay</p>
                            <p className="text-xs text-zinc-500 mt-0.5">Швидка оплата</p>
                        </div>
                        <span className="ml-auto text-xl"></span>
                    </label>
                </div>
            </div>
        </CartLayout>
    )
}