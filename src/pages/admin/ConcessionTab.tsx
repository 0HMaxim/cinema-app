    // ─── ConcessionAdmin tab ──────────────────────────────────────────────────────

    import { collection, onSnapshot, setDoc, deleteDoc, doc } from 'firebase/firestore'
    import type { ConcessionItem } from '../../models/order.ts'
    import {useEffect, useState} from "react";
    import {db} from "../../firebase.ts";

    export function ConcessionTab() {
        const [products, setProducts] = useState<ConcessionItem[]>([])
        const [loading,  setLoading]  = useState(true)
        const [showForm, setShowForm] = useState(false)
        const [editing,  setEditing]  = useState<ConcessionItem | null>(null)

        const [name,  setName]  = useState('')
        const [price, setPrice] = useState('')
        const [image, setImage] = useState('')

        useEffect(() => {
            const unsub = onSnapshot(collection(db, 'concessions'), snap => {
                setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as ConcessionItem[])
                setLoading(false)
            })
            return () => unsub()
        }, [])

        function openNew() {
            setEditing(null); setName(''); setPrice(''); setImage('🍿')
            setShowForm(true)
        }

        function openEdit(p: ConcessionItem) {
            setEditing(p); setName(p.name); setPrice(String(p.price)); setImage(p.image ?? '')
            setShowForm(true)
        }

        function cancelForm() {
            setShowForm(false); setEditing(null)
        }

        async function handleSave() {
            if (!name.trim() || !price) return
            const id = editing?.id ?? crypto.randomUUID()
            await setDoc(doc(db, 'concessions', id), {
                id, name: name.trim(), price: Number(price), image: image.trim(), quantity: 0
            })
            cancelForm()
        }

        async function handleDelete(id: string) {
            await deleteDoc(doc(db, 'concessions', id))
        }

        if (loading) return <p className="text-gray-500 text-sm">Завантаження...</p>

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 uppercase tracking-widest">
                        Товари ({products.length})
                    </p>
                    <button onClick={openNew}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        + Додати товар
                    </button>
                </div>

                {/* Form */}
                {showForm && (
                    <div className="p-5 rounded-xl border border-red-500/20 bg-gray-900 space-y-4">
                        <p className="text-sm font-semibold text-red-400 uppercase tracking-widest">
                            {editing ? 'Редагувати товар' : 'Новий товар'}
                        </p>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-1">
                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                                    Емодзі / Іконка
                                </label>
                                <input value={image} onChange={e => setImage(e.target.value)}
                                       placeholder="🍿"
                                       className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-2xl text-center focus:outline-none focus:border-red-500" />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                                    Назва
                                </label>
                                <input value={name} onChange={e => setName(e.target.value)}
                                       placeholder="Попкорн великий"
                                       className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1 uppercase tracking-widest">
                                Ціна (₴)
                            </label>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)}
                                   placeholder="85"
                                   className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500" />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={handleSave}
                                    disabled={!name.trim() || !price}
                                    className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
                                Зберегти
                            </button>
                            <button onClick={cancelForm}
                                    className="px-5 py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                                Скасувати
                            </button>
                        </div>
                    </div>
                )}

                {/* Product grid */}
                {products.length === 0 && !showForm ? (
                    <div className="p-8 rounded-xl border border-dashed border-gray-700 text-center">
                        <p className="text-gray-500 text-sm">Немає товарів</p>
                        <button onClick={openNew}
                                className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors">
                            + Додати перший товар
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {products.map(p => (
                            <div key={p.id}
                                 className="p-4 rounded-xl border border-gray-800 bg-gray-900 hover:border-gray-700 transition-colors">
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-4xl">{p.image}</span>
                                    <button onClick={() => handleDelete(p.id)}
                                            className="text-gray-600 hover:text-red-400 transition-colors text-xs">
                                        ✕
                                    </button>
                                </div>
                                <p className="font-semibold text-sm">{p.name}</p>
                                <p className="text-red-400 font-bold mt-1">{p.price}₴</p>
                                <button onClick={() => openEdit(p)}
                                        className="mt-3 text-xs text-gray-500 hover:text-white transition-colors">
                                    Редагувати →
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )
    }