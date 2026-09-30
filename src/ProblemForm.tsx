import { useState } from 'react'
import { uploadFile } from './storage'
import { ACCEPT, CATEGORIES, MAX_FILE_SIZE, SEVERITY_LABEL, STATUS_LABEL, type Problem, type Severity, type Status } from './types'

const today = () => new Date().toISOString().slice(0, 10)

export const emptyProblem = (): Problem => ({
  id: crypto.randomUUID(), title: '', description: '', category: CATEGORIES[0],
  severity: 'medium', reporter: '', reportedAt: today(), status: 'open', solution: '', solver: '', solvedAt: '', attachments: [],
})

interface Props {
  initial: Problem
  onSave: (p: Problem) => void | Promise<void>
  onCancel: () => void
}

export default function ProblemForm({ initial, onSave, onCancel }: Props) {
  const [p, setP] = useState<Problem>(initial)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof Problem>(k: K, v: Problem[K]) => setP(prev => ({ ...prev, [k]: v }))

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const all = Array.from(list)
    const bad = all.filter(f => f.size > MAX_FILE_SIZE || !ACCEPT.split(',').includes(f.type))
    setErr(bad.length ? `ไฟล์ไม่ถูกต้อง (รองรับรูปภาพ/PDF ไม่เกิน 10MB): ${bad.map(f => f.name).join(', ')}` : '')
    setFiles(prev => [...prev, ...all.filter(f => !bad.includes(f))])
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    let uploaded: Problem['attachments']
    try {
      uploaded = await Promise.all(files.map(uploadFile))
    } catch (ex) {
      setErr('อัปโหลดไฟล์ไม่สำเร็จ: ' + (ex as Error).message)
      setBusy(false)
      return
    }
    const out = { ...p, attachments: [...p.attachments, ...uploaded] }
    if (out.status === 'solved' && !out.solvedAt) out.solvedAt = today()
    if (out.status !== 'solved') out.solvedAt = ''
    await onSave(out)
    setBusy(false)
  }

  return (
    <div className="modal-bg" onClick={onCancel}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial.title ? 'แก้ไขรายการ' : 'แจ้งปัญหาใหม่'}</h2>

        <label>หัวข้อปัญหา *
          <input required value={p.title} onChange={e => set('title', e.target.value)} />
        </label>
        <label>รายละเอียด
          <textarea rows={3} value={p.description} onChange={e => set('description', e.target.value)} />
        </label>

        <div className="grid">
          <label>ประเภทปัญหา
            <select value={p.category} onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label>ความรุนแรง
            <select value={p.severity} onChange={e => set('severity', e.target.value as Severity)}>
              {(Object.keys(SEVERITY_LABEL) as Severity[]).map(k => <option key={k} value={k}>{SEVERITY_LABEL[k]}</option>)}
            </select>
          </label>
          <label>ชื่อผู้แจ้ง *
            <input required value={p.reporter} onChange={e => set('reporter', e.target.value)} />
          </label>
          <label>วันที่พบ
            <input type="date" value={p.reportedAt} onChange={e => set('reportedAt', e.target.value)} />
          </label>
          <label>สถานะ
            <select value={p.status} onChange={e => set('status', e.target.value as Status)}>
              {(Object.keys(STATUS_LABEL) as Status[]).map(k => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
            </select>
          </label>
        </div>

        {p.status !== 'open' && (
          <fieldset>
            <legend>การแก้ไขปัญหา</legend>
            <label>วิธีแก้ไข / การดำเนินการ
              <textarea rows={3} value={p.solution} onChange={e => set('solution', e.target.value)} />
            </label>
            <div className="grid">
              <label>{p.status === 'solved' ? 'ชื่อผู้แก้เสร็จ *' : 'ชื่อผู้กำลังแก้ *'}
                <input required value={p.solver} onChange={e => set('solver', e.target.value)} />
              </label>
              {p.status === 'solved' && (
                <label>วันที่แก้ไขเสร็จ
                  <input type="date" value={p.solvedAt || today()} onChange={e => set('solvedAt', e.target.value)} />
                </label>
              )}
            </div>
          </fieldset>
        )}

        <label>แนบไฟล์ (รูปภาพ / PDF ไม่เกิน 10MB ต่อไฟล์)
          <input type="file" multiple accept={ACCEPT} onChange={e => { addFiles(e.target.files); e.target.value = '' }} />
        </label>
        {(p.attachments.length > 0 || files.length > 0) && (
          <ul className="files">
            {p.attachments.map(a => (
              <li key={a.path}>📎 {a.name} <button type="button" onClick={() => set('attachments', p.attachments.filter(x => x.path !== a.path))}>ลบ</button></li>
            ))}
            {files.map((f, i) => (
              <li key={i}>🆕 {f.name} <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>ลบ</button></li>
            ))}
          </ul>
        )}
        {err && <p className="error">{err}</p>}

        <div className="actions">
          <button type="button" className="btn ghost" disabled={busy} onClick={onCancel}>ยกเลิก</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </form>
    </div>
  )
}
