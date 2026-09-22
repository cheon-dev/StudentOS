import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Printer, QrCode } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useAuth } from '../context/useAuth.ts'
import { subscribeToInventoryItem } from '../services/inventoryService.ts'
import type { InventoryItem } from '../types/inventory.ts'
import { getFirebaseErrorMessage } from '../utils/firebaseError.ts'

export function InventoryDetail() {
  const { itemId } = useParams()
  const { user } = useAuth()
  const uid = user?.uid
  const [item, setItem] = useState<InventoryItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (!uid || !itemId) return; return subscribeToInventoryItem(uid, itemId, (value) => { setItem(value); setLoading(false) }, (reason) => { setError(getFirebaseErrorMessage(reason, 'Inventory item could not be loaded.')); setLoading(false) }) }, [itemId, uid])
  function downloadQr() { const canvas = qrRef.current?.querySelector('canvas'); if (!canvas || !item) return; const link = document.createElement('a'); link.download = `${item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-qr.png`; link.href = canvas.toDataURL('image/png'); link.click() }
  if (loading) return <div className="inventory-page"><div className="module-loading">Loading item...</div></div>
  if (error || !item) return <div className="inventory-page"><section className="subjects-feedback subjects-feedback--error"><QrCode size={25} /><h2>Item unavailable</h2><p>{error || 'This inventory item no longer exists.'}</p><Link className="secondary-button" to="/inventory">Back to inventory</Link></section></div>
  return <div className="inventory-detail-page"><Link className="back-link" to="/inventory"><ArrowLeft size={15} /> Back to inventory</Link><section className="inventory-detail-hero"><div><p className="dashboard-eyebrow">Inventory item</p><h1>{item.name}</h1><p>{item.description || 'No description added.'}</p><div className="inventory-detail-tags"><span>{item.category}</span><span>{item.condition}</span><span>Quantity {item.quantity}</span></div></div><div className="qr-card" ref={qrRef}><QRCodeCanvas value={item.qrCode} size={170} bgColor="#ffffff" fgColor="#1d2027" includeMargin /><strong>Opaque StudentOS ID</strong><div><button className="secondary-button" type="button" onClick={downloadQr}><QrCode size={15} /> Save QR</button><button className="secondary-button" type="button" onClick={() => window.print()}><Printer size={15} /> Print</button></div></div></section><section className="inventory-detail-fields"><Detail label="Location" value={item.location || 'Not specified'} /><Detail label="Purchase date" value={item.purchaseDate || 'Not specified'} /><Detail label="Purchase price" value={item.purchasePrice === null ? 'Not specified' : `₱${item.purchasePrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`} /><Detail label="Serial number" value={item.serialNumber || 'Not specified'} /><Detail label="Notes" value={item.notes || 'No notes'} /><Detail label="QR identifier" value={item.qrCode} /></section></div>
}
function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div> }
