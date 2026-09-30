export type Status = 'open' | 'in_progress' | 'solved'
export type Severity = 'low' | 'medium' | 'high' | 'critical'

export interface Attachment {
  name: string
  path: string // path ใน Supabase Storage
  type: string
  size: number
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024
export const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,application/pdf'

export interface Problem {
  id: string
  title: string
  description: string
  category: string
  severity: Severity
  reporter: string
  reportedAt: string // YYYY-MM-DD
  status: Status
  solution: string
  solver: string
  solvedAt: string // YYYY-MM-DD or ''
  attachments: Attachment[]
}

export const STATUS_LABEL: Record<Status, string> = {
  open: 'ยังไม่ได้แก้',
  in_progress: 'กำลังแก้',
  solved: 'แก้เสร็จ',
}

export const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'ต่ำ',
  medium: 'ปานกลาง',
  high: 'สูง',
  critical: 'วิกฤต',
}

export const CATEGORIES = ['เครื่องจักร/อุปกรณ์', 'กระบวนการทำงาน', 'คุณภาพสินค้า', 'ความปลอดภัย', 'ระบบ IT/ซอฟต์แวร์', 'บุคลากร', 'วัสดุ/สต็อก', 'อื่น ๆ']
