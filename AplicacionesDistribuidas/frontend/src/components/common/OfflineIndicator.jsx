import { useState, useEffect } from 'react'
import { isOnline, onOnlineStatusChange, getPendingTriages } from '../../utils/offlineStorage'

export default function OfflineIndicator() {
    const [online, setOnline] = useState(isOnline())
    const [pendingCount, setPendingCount] = useState(0)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Listen for online/offline changes
        const cleanup = onOnlineStatusChange((status) => {
            setOnline(status)
            setVisible(!status) // Show when offline
        })

        // Check pending triages count
        const checkPending = async () => {
            try {
                const pending = await getPendingTriages()
                setPendingCount(pending.length)
            } catch (e) {
                console.error('Error checking pending triages:', e)
            }
        }

        checkPending()
        const interval = setInterval(checkPending, 5000)

        return () => {
            cleanup()
            clearInterval(interval)
        }
    }, [])

    // Show indicator when offline or when there are pending items
    useEffect(() => {
        if (!online || pendingCount > 0) {
            setVisible(true)
        } else {
            // Hide after a delay when back online and synced
            const timer = setTimeout(() => setVisible(false), 3000)
            return () => clearTimeout(timer)
        }
    }, [online, pendingCount])

    if (!visible) return null

    return (
        <div className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 transition-all duration-300 ${visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
            <div className={`rounded-lg shadow-lg p-4 ${online ? 'bg-green-500' : 'bg-orange-500'} text-white`}>
                <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${online ? 'bg-green-200 animate-pulse' : 'bg-orange-200'}`}></div>
                    <div className="flex-1">
                        <p className="font-semibold text-sm">
                            {online ? '✓ En línea' : '⚡ Sin conexión'}
                        </p>
                        <p className="text-xs opacity-90">
                            {online ? (
                                pendingCount > 0
                                    ? `Sincronizando ${pendingCount} registro(s)...`
                                    : 'Todo sincronizado'
                            ) : (
                                `Modo offline activo${pendingCount > 0 ? ` • ${pendingCount} pendiente(s)` : ''}`
                            )}
                        </p>
                    </div>
                    {!online && (
                        <span className="text-2xl">📡</span>
                    )}
                </div>
            </div>
        </div>
    )
}
