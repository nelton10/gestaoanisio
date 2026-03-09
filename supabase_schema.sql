-- Script para criar as tabelas necessárias no Supabase
-- Execute este script no SQL Editor do seu projeto Supabase

-- 1. Tabela config
CREATE TABLE IF NOT EXISTS public.config (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL
);

-- 2. Tabela alumnos
CREATE TABLE IF NOT EXISTS public.alumnos (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    turma TEXT NOT NULL
);

-- 3. Tabela active_exits
CREATE TABLE IF NOT EXISTS public.active_exits (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL,
    aluno_nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    destino TEXT NOT NULL,
    start_time BIGINT NOT NULL,
    professor TEXT NOT NULL,
    autor_role TEXT NOT NULL,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE
);

-- 4. Tabela history
CREATE TABLE IF NOT EXISTS public.history (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL,
    aluno_nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    categoria TEXT NOT NULL,
    detalhe TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    raw_timestamp BIGINT NOT NULL,
    professor TEXT NOT NULL,
    autor_role TEXT,
    foto_url TEXT
);

-- 5. Tabela coordination_queue
CREATE TABLE IF NOT EXISTS public.coordination_queue (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL,
    aluno_nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    motivo TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    professor TEXT NOT NULL,
    foto_url TEXT
);

-- 6. Tabela library_queue
CREATE TABLE IF NOT EXISTS public.library_queue (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL,
    aluno_nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    professor_coord TEXT NOT NULL,
    obs_coord TEXT NOT NULL,
    foto_url TEXT
);

-- 7. Tabela suspensions
CREATE TABLE IF NOT EXISTS public.suspensions (
    id TEXT PRIMARY KEY,
    aluno_id TEXT NOT NULL,
    aluno_nome TEXT NOT NULL,
    turma TEXT NOT NULL,
    return_date TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

-- 8. Tabela avisos
CREATE TABLE IF NOT EXISTS public.avisos (
    id TEXT PRIMARY KEY,
    texto TEXT NOT NULL,
    autor TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    raw_timestamp BIGINT NOT NULL
);

-- Habilitar o Realtime para as tabelas para que a UI atualize automaticamente
alter publication supabase_realtime add table public.config;
alter publication supabase_realtime add table public.alumnos;
alter publication supabase_realtime add table public.active_exits;
alter publication supabase_realtime add table public.history;
alter publication supabase_realtime add table public.coordination_queue;
alter publication supabase_realtime add table public.library_queue;
alter publication supabase_realtime add table public.suspensions;
alter publication supabase_realtime add table public.avisos;
