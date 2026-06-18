// src/pages/cart/Concession.tsx

import type {ConcessionItem} from "../../models/order.ts";

import {useEffect, useState} from 'react'
import { useNavigate, useParams } from 'react-router-dom'


import {db} from "../../firebase.ts";
import {collection, onSnapshot} from "firebase/firestore";



export default function Concession() {
    const navigate = useNavigate()
    const { orderId } = useParams()

    const [items, setItems] = useState<ConcessionItem[]>([])
    const [products, setProducts] = useState<ConcessionItem[]>([])


    const ticketsCart = JSON.parse(
        sessionStorage.getItem('cart_seats') ?? '{"seats":[]}'
    )

    const ticketsTotal =
        ticketsCart.seats?.reduce(
            (sum: number, seat: any) => sum + seat.price,
            0
        ) ?? 0




    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'concessions'),
            snapshot => {
                setProducts(
                    snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as ConcessionItem[]
                )
            }
        )

        return () => unsub()
    }, [])

    function changeQuantity(
        product: Omit<ConcessionItem, 'quantity'>,
        delta: number
    ) {
        setItems(prev => {
            const existing = prev.find(i => i.id === product.id)

            if (!existing && delta > 0) {
                return [...prev, { ...product, quantity: 1 }]
            }

            return prev
                .map(item =>
                    item.id === product.id
                        ? {
                            ...item,
                            quantity: Math.max(
                                0,
                                item.quantity + delta
                            )
                        }
                        : item
                )
                .filter(item => item.quantity > 0)
        })
    }

    const total = items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
    )

    function handleContinue() {
        sessionStorage.setItem(
            'cart_concessions',
            JSON.stringify(items)
        )

        navigate(`/cart/${orderId}/checkout`)
    }

    const grandTotal = ticketsTotal + total


    return (
        <div className="max-w-6xl mx-auto px-4 py-8">

            <div className="flex items-center justify-between mb-8">
                <h1 className="text-2xl font-bold">
                    Snacks & Drinks
                </h1>

                <span className="text-zinc-400 text-sm">
                    Optional
                </span>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                {products.map(product => {
                    const quantity =
                        items.find(i => i.id === product.id)
                            ?.quantity ?? 0

                    return (
                        <div
                            key={product.id}
                            className="rounded-2xl border border-white/10 bg-white/5 p-5"
                        >
                            <div className="text-5xl mb-3">
                                {product.image}
                            </div>

                            <h3 className="font-semibold">
                                {product.name}
                            </h3>

                            <p className="text-zinc-400 text-sm mt-1">
                                {product.price} ₴
                            </p>

                            <div className="flex items-center gap-3 mt-5">

                                <button
                                    onClick={() =>
                                        changeQuantity(product, -1)
                                    }
                                    className="w-9 h-9 rounded-lg bg-zinc-800"
                                >
                                    -
                                </button>

                                <span className="font-semibold">
                                    {quantity}
                                </span>

                                <button
                                    onClick={() =>
                                        changeQuantity(product, 1)
                                    }
                                    className="w-9 h-9 rounded-lg bg-red-600"
                                >
                                    +
                                </button>

                            </div>
                        </div>
                    )
                })}
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">



                <div className="lg:sticky lg:top-20 h-fit">

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                        <h2 className="font-semibold mb-4">
                            Your Order
                        </h2>

                        {ticketsCart.seats?.map((seat: any) => (
                            <div
                                key={`${seat.row}_${seat.seat}`}
                                className="flex justify-between text-sm mb-2"
                            >
                                <span>{seat.label}</span>
                                <span>{seat.price} ₴</span>
                            </div>
                        ))}

                        {items.length > 0 && (
                            <>
                                <div className="border-t border-white/10 my-4" />

                                {items.map(item => (
                                    <div
                                        key={item.id}
                                        className="flex justify-between text-sm mb-2"
                                    >
                        <span>
                            {item.name} × {item.quantity}
                        </span>

                                        <span>
                            {item.price * item.quantity} ₴
                        </span>
                                    </div>
                                ))}
                            </>
                        )}

                        <div className="border-t border-white/10 mt-4 pt-4 flex justify-between font-bold">
                            <span>Total</span>
                            <span>{grandTotal} ₴</span>
                        </div>

                        <button
                            onClick={handleContinue}
                            className="w-full mt-4 py-3 rounded-xl bg-red-600"
                        >
                            Continue →
                        </button>

                    </div>

                </div>




                <button
                    onClick={handleContinue}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 transition-colors"
                >
                    Continue to Checkout →
                </button>

                <button
                    onClick={() =>
                        navigate(`/cart/${orderId}/checkout`)
                    }
                    className="w-full mt-3 py-3 rounded-xl border border-white/10"
                >
                    Skip
                </button>

            </div>
        </div>
    )
}