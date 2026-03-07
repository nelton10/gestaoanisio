import { supabase } from './supabase';
import { Aluno, ActiveExit, HistoryRecord, CoordinationItem, LibraryItem, Suspension, Aviso, AppConfig } from '@/types';

const STORAGE_KEYS = {
  AUTH: 'anisio_auth',
} as const;

export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

// Config
export async function getConfig(): Promise<AppConfig & { alunosList: Aluno[] }> {
  const { data, error } = await supabase
    .from('config')
    .select('data')
    .eq('id', 'app_config')
    .single();

  const { data: AlunosData } = await supabase
    .from('alumnos')
    .select('*')
    .order('nome', { ascending: true });

  const defaultConfig: AppConfig = {
    autoBlocks: [],
    exitLimitMinutes: 15,
    passwords: { admin: 'gestao', professor: 'prof', apoio: 'apoio' },
  };

  const configData = data?.data || defaultConfig;
  return { ...configData, alunosList: AlunosData || [] };
}

export async function saveConfig(data: Partial<AppConfig>) {
  const { data: current } = await supabase
    .from('config')
    .select('data')
    .eq('id', 'app_config')
    .single();

  const newValue = { ...current?.data, ...data };
  delete (newValue as any).alunosList; // Alunos are in their own table

  await supabase
    .from('config')
    .upsert({ id: 'app_config', data: newValue });
}

// Alunos (Manual management)
export async function addAluno(aluno: Omit<Aluno, 'id'>) {
  await supabase.from('alumnos').insert([aluno]);
}

export async function updateAluno(id: string, data: Partial<Aluno>) {
  await supabase.from('alumnos').update(data).eq('id', id);
}

export async function deleteAlunos(ids: string[]) {
  await supabase.from('alumnos').delete().in('id', ids);
}

export async function deleteAlunosByTurma(turma: string) {
  await supabase.from('alumnos').delete().eq('turma', turma);
}

// Active Exits
export async function getActiveExits(): Promise<ActiveExit[]> {
  const { data } = await supabase.from('active_exits').select('*');
  return data || [];
}

export async function addActiveExit(exit: ActiveExit) {
  await supabase.from('active_exits').insert([exit]);
}

export async function removeActiveExit(id: string) {
  await supabase.from('active_exits').delete().eq('id', id);
}

// History
export async function getHistory(): Promise<HistoryRecord[]> {
  const { data } = await supabase
    .from('history')
    .select('*')
    .order('raw_timestamp', { ascending: false });

  // Map back to TypeScript interface (Supabase uses snake_case often, but here we kept camelCase in SQL for ease)
  return (data || []).map(r => ({
    ...r,
    rawTimestamp: r.raw_timestamp,
    autorRole: r.autor_role,
    fotoUrl: r.foto_url
  }));
}

export async function addHistoryRecord(record: HistoryRecord) {
  const dbRecord = {
    ...record,
    raw_timestamp: record.rawTimestamp,
    autor_role: record.autorRole,
    foto_url: record.fotoUrl
  };
  delete (dbRecord as any).rawTimestamp;
  delete (dbRecord as any).autorRole;
  delete (dbRecord as any).fotoUrl;

  await supabase.from('history').insert([dbRecord]);
}

export async function updateHistoryRecord(id: string, data: Partial<HistoryRecord>) {
  const dbData: any = { ...data };
  if (data.rawTimestamp) dbData.raw_timestamp = data.rawTimestamp;
  if (data.autorRole) dbData.autor_role = data.autorRole;
  if (data.fotoUrl) dbData.foto_url = data.fotoUrl;

  delete dbData.rawTimestamp;
  delete dbData.autorRole;
  delete dbData.fotoUrl;

  await supabase.from('history').update(dbData).eq('id', id);
}

export async function deleteHistoryRecord(id: string) {
  await supabase.from('history').delete().eq('id', id);
}

// Coordination Queue
export async function getCoordinationQueue(): Promise<CoordinationItem[]> {
  const { data } = await supabase.from('coordination_queue').select('*');
  return (data || []).map(r => ({ ...r, fotoUrl: r.foto_url }));
}

export async function addCoordinationItem(item: CoordinationItem) {
  const dbItem = { ...item, foto_url: item.fotoUrl };
  delete (dbItem as any).fotoUrl;
  await supabase.from('coordination_queue').insert([dbItem]);
}

export async function removeCoordinationItem(id: string) {
  await supabase.from('coordination_queue').delete().eq('id', id);
}

// Library Queue
export async function getLibraryQueue(): Promise<LibraryItem[]> {
  const { data } = await supabase.from('library_queue').select('*');
  return (data || []).map(r => ({ ...r, professorCoord: r.professor_coord, obsCoord: r.obs_coord, fotoUrl: r.foto_url }));
}

export async function addLibraryItem(item: LibraryItem) {
  const dbItem = {
    ...item,
    professor_coord: item.professorCoord,
    obs_coord: item.obsCoord,
    foto_url: item.fotoUrl
  };
  delete (dbItem as any).professorCoord;
  delete (dbItem as any).obsCoord;
  delete (dbItem as any).fotoUrl;
  await supabase.from('library_queue').insert([dbItem]);
}

export async function removeLibraryItem(id: string) {
  await supabase.from('library_queue').delete().eq('id', id);
}

// Suspensions
export async function getSuspensions(): Promise<Suspension[]> {
  const { data } = await supabase.from('suspensions').select('*');
  return (data || []).map(r => ({ ...r, returnDate: r.return_date }));
}

export async function addSuspension(s: Suspension) {
  const dbS = { ...s, return_date: s.returnDate };
  delete (dbS as any).returnDate;
  await supabase.from('suspensions').insert([dbS]);
}

export async function removeSuspension(id: string) {
  await supabase.from('suspensions').delete().eq('id', id);
}

// Avisos
export async function getAvisos(): Promise<Aviso[]> {
  const { data } = await supabase
    .from('avisos')
    .select('*')
    .order('raw_timestamp', { ascending: false });
  return (data || []).map(r => ({ ...r, rawTimestamp: r.raw_timestamp }));
}

export async function addAviso(a: Aviso) {
  const dbA = { ...a, raw_timestamp: a.rawTimestamp };
  delete (dbA as any).rawTimestamp;
  await supabase.from('avisos').insert([dbA]);
}

export async function removeAviso(id: string) {
  await supabase.from('avisos').delete().eq('id', id);
}

// Auth (Still in localStorage as it is session-based and simple)
export function getSavedAuth() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveAuth(role: string, name: string) {
  try { localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify({ role, name })); } catch { }
}

export function clearAuth() {
  try { localStorage.removeItem(STORAGE_KEYS.AUTH); } catch { }
}
