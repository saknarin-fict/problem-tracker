import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { Attachment, Problem } from './types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const configured = Boolean(url && key)
const supabase = configured ? createClient(url!, key!) : null

interface Row {
  id: string
  title: string
  description: string
  category: string
  severity: Problem['severity']
  reporter: string
  reported_at: string
  status: Problem['status']
  solution: string
  solver: string
  solved_at: string | null
  attachments: Attachment[] | null
}

const fromRow = (r: Row): Problem => ({
  id: r.id, title: r.title, description: r.description, category: r.category, severity: r.severity,
  reporter: r.reporter, reportedAt: r.reported_at, status: r.status, solution: r.solution,
  solver: r.solver, solvedAt: r.solved_at ?? '', attachments: r.attachments ?? [],
})

const toRow = (p: Problem): Row => ({
  id: p.id, title: p.title, description: p.description, category: p.category, severity: p.severity,
  reporter: p.reporter, reported_at: p.reportedAt, status: p.status, solution: p.solution,
  solver: p.solver, solved_at: p.solvedAt || null, attachments: p.attachments,
})

const BUCKET = 'attachments'

export const fileUrl = (path: string) => supabase!.storage.from(BUCKET).getPublicUrl(path).data.publicUrl

export async function uploadFile(file: File): Promise<Attachment> {
  if (!supabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const path = `${crypto.randomUUID()}${ext ? '.' + ext : ''}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type })
  if (error) throw new Error(error.message)
  return { name: file.name, path, type: file.type, size: file.size }
}

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(configured)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.from('problems').select('*').order('reported_at', { ascending: false })
    if (error) setError(error.message)
    else { setError(''); setProblems((data as Row[]).map(fromRow)) }
    setLoading(false)
  }, [])

  useEffect(() => { void reload() }, [reload])

  const save = async (p: Problem) => {
    if (!supabase) return
    const { error } = await supabase.from('problems').upsert(toRow(p))
    if (error) setError(error.message)
    await reload()
  }

  const remove = async (id: string) => {
    if (!supabase) return
    const files = problems.find(p => p.id === id)?.attachments.map(a => a.path) ?? []
    if (files.length) await supabase.storage.from(BUCKET).remove(files)
    const { error } = await supabase.from('problems').delete().eq('id', id)
    if (error) setError(error.message)
    await reload()
  }

  return { problems, loading, error, save, remove }
}
