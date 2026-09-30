import { useMemo, useState } from 'react'
import ProblemForm, { emptyProblem } from './ProblemForm'
import { configured, fileUrl, useProblems } from './storage'
import { SEVERITY_LABEL, STATUS_LABEL, type Problem, type Status } from './types'

const daysBetween = (a: string, b: string) => Math.max(0, Math.round((+new Date(b) - +new Date(a)) / 86400000))

function exportCsv(rows: Problem[]) {
  const head = ['หัวข้อ', 'รายละเอียด', 'ประเภท', 'ความรุนแรง', 'ผู้แจ้ง', 'วันที่พบ', 'สถานะ', 'วิธีแก้ไข', 'ผู้แก้ไข', 'วันที่แก้เสร็จ']
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`
  const lines = rows.map(r =>
    [r.title, r.description, r.category, SEVERITY_LABEL[r.severity], r.reporter, r.reportedAt, STATUS_LABEL[r.status], r.solution, r.solver, r.solvedAt]
      .map(esc)
      .join(','),
  )
  const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'problems.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function App() {
  const { problems, loading, error, save: saveProblem, remove: removeProblem } = useProblems()
  const [editing, setEditing] = useState<Problem | null>(null)
  const [tab, setTab] = useState<'all' | Status>('all')
  const [q, setQ] = useState('')

  const stats = useMemo(() => {
    const solved = problems.filter(p => p.status === 'solved')
    return {
      total: problems.length,
      open: problems.filter(p => p.status === 'open').length,
      prog: problems.filter(p => p.status === 'in_progress').length,
      solved: solved.length,
    }
  }, [problems])

  const shown = problems
    .filter(p => (tab === 'all' || p.status === tab))
    .filter(p => !q || [p.title, p.description, p.solution, p.reporter, p.solver, p.category, STATUS_LABEL[p.status], SEVERITY_LABEL[p.severity], p.reportedAt].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.reportedAt.localeCompare(a.reportedAt))

  const save = async (p: Problem) => {
    await saveProblem(p)
    setEditing(null)
  }
  const remove = (id: string) => {
    if (confirm('ลบรายการนี้ใช่หรือไม่?')) void removeProblem(id)
  }

  if (!configured) {
    return (
      <div className="container">
        <h1>ยังไม่ได้ตั้งค่า Supabase</h1>
        <p>สร้างไฟล์ <code>.env</code> ตาม <code>.env.example</code> แล้วรัน <code>npm run dev</code> ใหม่</p>
      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <h1>ระบบบันทึกปัญหาและการแก้ไข</h1>
        <div className="row">
          <button className="btn ghost" onClick={() => exportCsv(shown)}>ส่งออก CSV</button>
          <button className="btn primary" onClick={() => setEditing(emptyProblem())}>+ แจ้งปัญหาใหม่</button>
        </div>
      </header>

      <section className="stats">
        <div className="card red"><span>ยังไม่ได้แก้</span><b>{stats.open}</b></div>
        <div className="card amber"><span>กำลังแก้</span><b>{stats.prog}</b></div>
        <div className="card green"><span>แก้เสร็จ</span><b>{stats.solved}</b></div>
      </section>

      <section className="filters">
        <div className="tabs">
          {(['all', 'open', 'in_progress', 'solved'] as const).map(t => (
            <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
              {t === 'all' ? 'ทั้งหมด' : STATUS_LABEL[t]}
            </button>
          ))}
        </div>
        <input placeholder="🔍 ค้นหา หัวข้อ / ชื่อคน / วิธีแก้ / สถานะ..." value={q} onChange={e => setQ(e.target.value)} />
      </section>

      {error && <p className="empty" style={{ color: '#b91c1c' }}>เกิดข้อผิดพลาด: {error}</p>}
      {loading && <p className="empty">กำลังโหลด...</p>}
      <section className="list">
        {shown.length === 0 && <p className="empty">ไม่พบรายการ</p>}
        {shown.map(p => (
          <article key={p.id} className={`item status-${p.status}`}>
            <div className="item-head">
              <h3>{p.title}</h3>
              <span className={`badge st-${p.status}`}>{STATUS_LABEL[p.status]}</span>
            </div>
            <p className="meta">
              {p.category} · ความรุนแรง: {SEVERITY_LABEL[p.severity]} · แจ้งโดย {p.reporter || '-'} · {p.reportedAt}
            </p>
            {p.description && <p>{p.description}</p>}
            {p.status !== 'open' && (
              <div className="solution">
                <b>{p.status === 'solved' ? '✅ วิธีแก้ไข' : '🔧 ความคืบหน้า'}:</b> {p.solution || '-'}
                <div className="meta">
                  {p.status === 'solved' ? 'แก้เสร็จโดย' : 'กำลังแก้โดย'}: <b>{p.solver || '-'}</b>
                  {p.solvedAt && ` · เสร็จเมื่อ ${p.solvedAt} (ใช้เวลา ${daysBetween(p.reportedAt, p.solvedAt)} วัน)`}
                </div>
              </div>
            )}
            {p.attachments.length > 0 && (
              <div className="attach">
                {p.attachments.map(a =>
                  a.type.startsWith('image/') ? (
                    <a key={a.path} href={fileUrl(a.path)} target="_blank" rel="noreferrer" title={a.name}>
                      <img src={fileUrl(a.path)} alt={a.name} />
                    </a>
                  ) : (
                    <a key={a.path} className="pdf" href={fileUrl(a.path)} target="_blank" rel="noreferrer">📄 {a.name}</a>
                  ),
                )}
              </div>
            )}
            <div className="row end">
              {p.status !== 'solved' && (
                <button className="btn small primary" onClick={() => setEditing({ ...p, status: 'solved' })}>บันทึกการแก้ไข</button>
              )}
              <button className="btn small ghost" onClick={() => setEditing(p)}>แก้ไข</button>
              <button className="btn small danger" onClick={() => remove(p.id)}>ลบ</button>
            </div>
          </article>
        ))}
      </section>

      {editing && <ProblemForm key={editing.id + editing.status} initial={editing} onSave={save} onCancel={() => setEditing(null)} />}
    </div>
  )
}
