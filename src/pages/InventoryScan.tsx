import { useEffect, useState } from 'react'
import { ArrowLeft, Camera, QrCode } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { Link, useNavigate } from 'react-router-dom'

export function InventoryScan() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('Point your camera at a StudentOS inventory QR code.')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode('inventory-scanner')
    let active = true

    // html5-qrcode throws synchronously when stop() runs before start() finishes.
    const stopScanner = async () => {
      try {
        await scanner.stop()
      } catch {
        // The scanner is already stopped or has not started yet.
      }
    }

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (value) => {
            if (!active) return
            const match = /^studentos:\/\/inventory\/([A-Za-z0-9_-]+)$/.exec(value.trim())
            if (!match) {
              setMessage('That QR code is not a StudentOS inventory code.')
              return
            }
            setMessage('Inventory item found.')
            void stopScanner().finally(() => navigate(`/inventory/${match[1]}`))
          },
          () => undefined,
        )
        if (!active) {
          await stopScanner()
          return
        }
        setRunning(true)
      } catch {
        if (active) setMessage('Camera permission was denied or no camera is available.')
      }
    }

    void start()
    return () => {
      active = false
      setRunning(false)
      void stopScanner()
    }
  }, [navigate])

  return (
    <div className="inventory-scan-page">
      <Link className="back-link" to="/inventory">
        <ArrowLeft size={15} /> Back to inventory
      </Link>
      <section className="scan-card">
        <div className="scan-card-heading">
          <span className="inventory-icon"><Camera size={21} /></span>
          <div>
            <p className="dashboard-eyebrow">Camera scanner</p>
            <h1>Scan inventory QR</h1>
          </div>
        </div>
        <div id="inventory-scanner" className="inventory-scanner" aria-label="Inventory QR scanner" />
        {!running && <div className="module-loading">Starting camera...</div>}
        <p className="scan-message">{message}</p>
        <div className="scan-safety">
          <QrCode size={16} />
          <span>Only opaque StudentOS inventory IDs are accepted. External URLs are ignored.</span>
        </div>
      </section>
    </div>
  )
}
