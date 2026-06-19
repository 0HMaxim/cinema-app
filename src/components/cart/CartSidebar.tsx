// src/components//CartSidebar.tsx
import type { ReactNode } from 'react'
import type { CartSessionInfo } from '../../models/cart.ts'

interface SidebarSummary {
    content:      ReactNode
    total:        number
    ctaLabel:     string
    onCta:        () => void
    ctaDisabled?: boolean
    note?:        string
}

interface Props {
    session: CartSessionInfo
    sidebar: SidebarSummary
}

export default function CartSidebar({ session, sidebar }: Props) {
    return (
        <div className="lg:sticky lg:top-[136px] space-y-4">

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <h2 className="text-sm font-semibold">Ваше замовлення</h2>

                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                    {sidebar.content}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                    <span className="text-sm text-zinc-400">Разом</span>
                    <span className="text-lg font-bold text-white">{sidebar.total}₴</span>
                </div>

                <button
                    onClick={sidebar.onCta}
                    disabled={sidebar.ctaDisabled}
                    className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500
                               disabled:opacity-30 disabled:cursor-not-allowed
                               text-white font-semibold text-sm transition-colors"
                >
                    {sidebar.ctaLabel}
                </button>

                {sidebar.note && (
                    <p className="text-center text-[11px] text-zinc-600">{sidebar.note}</p>
                )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/3 p-4 space-y-3 text-xs text-zinc-500">
                <div className="flex justify-between">
                    <span>Зал</span>
                    <span className="text-zinc-300">{session.hallName}</span>
                </div>
                <div className="flex justify-between">
                    <span>Формат</span>
                    <span className="text-zinc-300">{session.format}</span>
                </div>
                <div className="flex justify-between">
                    <span>Початок</span>
                    <span className="text-zinc-300">{session.time}</span>
                </div>
                {session.endTime && (
                    <div className="flex justify-between">
                        <span>Кінець</span>
                        <span className="text-zinc-300">{session.endTime}</span>
                    </div>
                )}
            </div>
        </div>
    )
}