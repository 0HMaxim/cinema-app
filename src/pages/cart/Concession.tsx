// src/pages/cart/Concession.tsx

import type { ConcessionItem } from '../../models/order.ts'
import { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db } from '../../firebase.ts'
import { collection, onSnapshot } from 'firebase/firestore'
import CartPageLayout from "../../layouts/CartPageLayout.tsx";



export default function Concession() {
    const navigate = useNavigate()
    const { orderId } = useParams()

    const [items,    setItems]    = useState<ConcessionItem[]>([])
    const [products, setProducts] = useState<ConcessionItem[]>([])

    const ticketsCart = useMemo(() => JSON.parse(
        sessionStorage.getItem('cart_seats') ?? '{"seats":[]}'
    ), [])

    const ticketsTotal: number =
        ticketsCart.seats?.reduce(
            (sum: number, seat: any) => sum + seat.price, 0
        ) ?? 0

    // Читаємо мета-дані сеансу зі збереженого кошика (cinemaId_sessionId)
    // Якщо хочеш — можна завантажити з Firestore, але для лейауту достатньо
    // того що вже є в cart_seats
    const sessionMeta = useMemo(() => {
        const raw = sessionStorage.getItem('cart_session_meta')
        return raw ? JSON.parse(raw) : null
    }, [])

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'concessions'), snapshot => {
            setProducts(
                snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ConcessionItem[]
            )
        })
        return () => unsub()
    }, [])

    function changeQuantity(product: Omit<ConcessionItem, 'quantity'>, delta: number) {
        setItems(prev => {
            const existing = prev.find(i => i.id === product.id)
            if (!existing && delta > 0) return [...prev, { ...product, quantity: 1 }]
            return prev
                .map(item =>
                    item.id === product.id
                        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
                        : item
                )
                .filter(item => item.quantity > 0)
        })
    }

    const concessionTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const grandTotal       = ticketsTotal + concessionTotal

    function handleContinue() {
        sessionStorage.setItem('cart_concessions', JSON.stringify(items))
        navigate(`/cart/${orderId}/checkout`)
    }

    // ── Sidebar summary content ──────────────────────────────────────────────
    const sidebarContent = (
        <>
            {/* Tickets */}
            {ticketsCart.seats?.map((seat: any) => (
                <div key={`${seat.row}_${seat.seat}`}
                     className="flex justify-between text-sm py-1 border-b border-white/5">
                    <span className="font-mono font-semibold">{seat.label}</span>
                    <span className="text-zinc-300">{seat.price}₴</span>
                </div>
            ))}

            {/* Concessions */}
            {items.length > 0 && (
                <>
                    <div className="border-t border-white/10 my-2" />
                    {items.map(item => (
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

    // ── Fallback session info (якщо немає мета) ──────────────────────────────
    const sessionInfo = {
        movieTitle:  sessionMeta?.movieTitle  ?? '—',
        cinemaName:  sessionMeta?.cinemaName  ?? '—',
        hallName:    sessionMeta?.hallName    ?? '—',
        date:        sessionMeta?.date        ?? '—',
        time:        sessionMeta?.time        ?? '—',
        endTime:     sessionMeta?.endTime     ?? null,
        format:      sessionMeta?.format      ?? '—',
        backHref:    `/cart/${orderId}/seatplan`,
    }

    return (
        <CartPageLayout
            session={sessionInfo}
            sidebar={{
                content:     sidebarContent,
                total:       grandTotal,
                ctaLabel:    `Далі → ${grandTotal}₴`,
                onCta:       handleContinue,
                note:        'Можна пропустити цей крок',
            }}
            mobileBar={
                <div className="fixed bottom-0 inset-x-0 lg:hidden bg-zinc-900/95 backdrop-blur border-t border-white/10 px-4 py-3 flex items-center gap-3 z-30">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-zinc-500">{items.length} позицій</p>
                        <p className="text-base font-bold">{grandTotal}₴</p>
                    </div>
                    <button
                        onClick={handleContinue}
                        className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                    >
                        Далі →
                    </button>
                </div>
            }
        >
            {/* ── Snack grid ───────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-xl font-bold">Snacks & Drinks</h1>
                <button
                    onClick={() => navigate(`/cart/${orderId}/checkout`)}
                    className="text-xs text-zinc-500 hover:text-white transition-colors"
                >
                    Пропустити →
                </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
                {products.map(product => {
                    const quantity = items.find(i => i.id === product.id)?.quantity ?? 0

                    return (
                        <div key={product.id}
                             className="rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-4">
                            <span className="text-4xl">{product.image}</span>

                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{product.name}</p>
                                <p className="text-zinc-400 text-xs mt-0.5">{product.price}₴</p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => changeQuantity(product, -1)}
                                    className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-colors"
                                >
                                    −
                                </button>
                                <span className="w-5 text-center font-semibold text-sm">{quantity}</span>
                                <button
                                    onClick={() => changeQuantity(product, 1)}
                                    className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-colors"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </CartPageLayout>
    )
}