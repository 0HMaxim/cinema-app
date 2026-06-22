import { useApp } from '../context/AppContext'

export default function LangSwitcher() {
    const { lang, setLang } = useApp()
    return (
        <div className="flex rounded-xl overflow-hidden border shrink-0" style={{ borderColor: 'var(--border)' }}>
            {(['uk', 'en', 'ru'] as const).map(l => (
                <button
                    key={l}
                    onClick={() => setLang(l)}
                    className="px-2.5 py-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide transition-all duration-150"
                    style={lang === l
                        ? { backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }
                        : { backgroundColor: 'transparent', color: 'var(--fg-muted)' }}
                >
                    {l}
                </button>
            ))}
        </div>
    )
}