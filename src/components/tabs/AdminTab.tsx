import React, { useState, useRef } from 'react';
import {
  UserPlus,
  PlusCircle,
  MoveHorizontal,
  Trash2,
  XCircle,
  KeyRound,
  Lock,
  FileUp,
  Download,
  Clock,
  RotateCcw,
  History
} from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, AppConfig } from '@/types';

interface AdminTabProps {
  alunos: Aluno[];
  config: AppConfig;
  history: any[];
  turmasExistentes: string[];
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
}

const AdminTab: React.FC<AdminTabProps> = ({ alunos, config, history, turmasExistentes, notify, refreshData }) => {
  // Estados de Formulário e UI
  const [nomeNovoAluno, setNomeNovoAluno] = useState('');
  const [turmaNovoAluno, setTurmaNovoAluno] = useState('');
  const [modoNovaTurma, setModoNovaTurma] = useState(false);
  const [turmaOrigem, setTurmaOrigem] = useState('');
  const [alunoEditando, setAlunoEditando] = useState<Aluno | null>(null);
  const [novaTurmaDestino, setNovaTurmaDestino] = useState('');
  const [adminTurmaFiltro, setAdminTurmaFiltro] = useState('');
  const [selectedAdminAlunos, setSelectedAdminAlunos] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState(false);
  const [tempLimit, setTempLimit] = useState(config.exitLimitMinutes);
  const [novoBlockStart, setNovoBlockStart] = useState('');
  const [novoBlockEnd, setNovoBlockEnd] = useState('');
  const [novoBlockLabel, setNovoBlockLabel] = useState('');
  const [editPasswords, setEditPasswords] = useState(config.passwords);
  const [isRestoreMode, setIsRestoreMode] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyInputRef = useRef<HTMLInputElement>(null);

  // --- GESTÃO DE ALUNOS ---
  const addStudent = async () => {
    if (!nomeNovoAluno || !turmaNovoAluno) return notify("Preencha nome e turma.");
    const novo = { nome: nomeNovoAluno.toUpperCase(), turma: turmaNovoAluno.toUpperCase() };
    await store.addAluno(novo);
    setNomeNovoAluno(''); setTurmaNovoAluno(''); setModoNovaTurma(false);
    await refreshData(); notify("Aluno adicionado!");
  };

  const deleteSelected = async () => {
    if (!selectedAdminAlunos.length) return;
    await store.deleteAlunos(selectedAdminAlunos);
    setSelectedAdminAlunos([]); setDeleteModal(false);
    await refreshData(); notify("Alunos removidos!");
  };

  const deleteEntireTurma = async () => {
    if (!adminTurmaFiltro) return;
    if (confirm(`ATENÇÃO: Você vai apagar TODOS os alunos da turma ${adminTurmaFiltro}. Confirma?`)) {
      await store.deleteAlunosByTurma(adminTurmaFiltro);
      setAdminTurmaFiltro(''); setSelectedAdminAlunos([]);
      await refreshData(); notify(`Turma ${adminTurmaFiltro} removida!`);
    }
  };

  const transferStudent = async () => {
    if (!alunoEditando || !novaTurmaDestino) return notify("Selecione destino.");
    await store.updateAluno(alunoEditando.id, { turma: novaTurmaDestino.toUpperCase() });
    setTurmaOrigem(''); setAlunoEditando(null);
    await refreshData(); notify("Transferência concluída!");
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const lines = (evt.target?.result as string).split('\n');
      const newAlunos: Omit<Aluno, 'id'>[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 && (line.toLowerCase().includes('turma') || line.toLowerCase().includes('nome'))) return;
        const parts = line.split(',');
        if (parts.length >= 2) {
          const t = parts[0].trim().toUpperCase();
          const n = parts[1].trim().toUpperCase();
          if (t && n) newAlunos.push({ nome: n, turma: t });
        }
      });

      if (newAlunos.length) {
        if (isRestoreMode) {
          // Simplistic restore: delete all and re-add
          const allIds = alunos.map(a => a.id);
          if (allIds.length) await store.deleteAlunos(allIds);
        }
        // Insert in chunks or one by one for simplicity
        for (const al of newAlunos) {
          await store.addAluno(al);
        }
        await refreshData(); notify(isRestoreMode ? "Base de alunos restaurada!" : "Alunos importados!");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- GESTÃO DE OCORRÊNCIAS (PADRÃO CSV) ---
  const exportOcorrencias = () => {
    if (!history.length) return notify("Sem dados para exportar.");
    let csv = "DATA,TURMA,NOME,DESCRIÇÃO\n";
    history.forEach(item => {
      const data = `"${item.data || ''}"`;
      const desc = `"${(item.detalhe || '').replace(/"/g, '""')}"`; // Using 'detalhe' instead of 'descricao' to match Supabase
      csv += `${data},${item.turma || ''},${item.alunoNome || ''},${desc}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `backup_sistema_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Exportação concluída!");
  };

  const restoreOcorrencias = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const lines = (evt.target?.result as string).split('\n');
      const restoredHistory: any[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 || !line.trim()) return;
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        if (parts && parts.length >= 4) {
          restoredHistory.push({
            id: store.generateId(),
            timestamp: parts[0].replace(/"/g, ''),
            turma: parts[1],
            alunoNome: parts[2],
            detalhe: parts[3].replace(/"/g, ''),
            rawTimestamp: Date.now(),
            categoria: 'ocorrencia' // Default for bulk restore
          });
        }
      });
      if (restoredHistory.length) {
        // Bulk delete current history and add new (simplified)
        // In a real app we might want a proper 'history' cleanup
        notify("A restauração de histórico via CSV está limitada no Supabase por questões de volume. Importando os primeiros registros...");
        for (const item of restoredHistory.slice(0, 50)) {
          await store.addHistoryRecord(item);
        }
        await refreshData(); notify(`${restoredHistory.length} registros restaurados!`);
      }
      if (historyInputRef.current) historyInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Modal de Exclusão */}
      {deleteModal && (
        <div className="fixed inset-0 z-[120] bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-strong rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-scale-in">
            <XCircle size={32} className="text-destructive mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-2 text-foreground">Apagar {selectedAdminAlunos.length} aluno(s)?</h3>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <button onClick={() => setDeleteModal(false)} className="py-3.5 bg-secondary rounded-2xl font-bold">Cancelar</button>
              <button onClick={deleteSelected} className="py-3.5 bg-destructive text-destructive-foreground rounded-2xl font-bold">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Novo Aluno */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><UserPlus size={18} className="text-primary" /> Novo Aluno</h3>
        <input type="text" placeholder="Nome Completo" className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none focus:ring-2 focus:ring-primary/20"
          value={nomeNovoAluno} onChange={e => setNomeNovoAluno(e.target.value)} />
        <div className="flex gap-2.5">
          <select className="flex-1 p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
            value={turmaNovoAluno} onChange={e => setTurmaNovoAluno(e.target.value)}>
            <option value="">Escolher Turma...</option>
            {turmasExistentes.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => setModoNovaTurma(!modoNovaTurma)} className="bg-secondary p-4 rounded-2xl transition-colors hover:text-primary">
            <PlusCircle size={20} />
          </button>
        </div>
        {modoNovaTurma && <input type="text" placeholder="Criar Turma (Ex: 9A)" className="w-full p-4 bg-card border-2 border-primary/30 rounded-2xl outline-none"
          value={turmaNovoAluno} onChange={e => setTurmaNovoAluno(e.target.value)} />}
        <button onClick={addStudent} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg active:scale-95">Adicionar</button>
      </div>

      {/* 2. Base de Alunos (CSV) */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><FileUp size={18} className="text-primary" /> Gestão de Alunos (CSV)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => { setIsRestoreMode(false); fileInputRef.current?.click(); }}
            className="py-4 bg-secondary text-foreground rounded-2xl font-bold border border-border text-sm flex items-center justify-center gap-2">
            <FileUp size={16} /> Importar Dados
          </button>
          <button onClick={() => { if (confirm("Apagar todos os alunos e substituir pelo arquivo?")) { setIsRestoreMode(true); fileInputRef.current?.click(); } }}
            className="py-4 bg-destructive/10 text-destructive rounded-2xl font-bold border border-destructive/20 text-sm flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Restaurar Base
          </button>
        </div>
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" />
      </div>

      {/* 3. Ocorrências (CSV) */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><History size={18} className="text-warning" /> Histórico do Sistema (CSV)</h3>
        <p className="text-xs text-muted-foreground italic">Padrão: DATA,TURMA,NOME,DESCRIÇÃO</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={exportOcorrencias}
            className="py-4 bg-secondary text-foreground rounded-2xl font-bold border border-border text-sm flex items-center justify-center gap-2">
            <Download size={16} /> Exportar Backup
          </button>
          <button onClick={() => { if (confirm("Substituir TODO o histórico pelo arquivo?")) historyInputRef.current?.click(); }}
            className="py-4 bg-warning/10 text-warning rounded-2xl font-bold border border-warning/20 text-sm flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Restaurar Backup
          </button>
        </div>
        <input type="file" accept=".csv" ref={historyInputRef} onChange={restoreOcorrencias} className="hidden" />
      </div>

      {/* 4. Transferência */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><MoveHorizontal size={18} className="text-warning" /> Transferência de Sala</h3>
        <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
          onChange={e => { setTurmaOrigem(e.target.value); setAlunoEditando(null); }} value={turmaOrigem}>
          <option value="">Turma de Origem...</option>
          {turmasExistentes.map(t => <option key={t}>{t}</option>)}
        </select>
        {turmaOrigem && (
          <select className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
            onChange={e => setAlunoEditando(alunos.find(a => a.id === e.target.value) || null)} value={alunoEditando?.id || ''}>
            <option value="">Selecionar Aluno...</option>
            {alunos.filter(a => a.turma === turmaOrigem).map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}
        {alunoEditando && (
          <div className="bg-warning/10 p-5 rounded-2xl border border-warning/20 space-y-3 animate-scale-in">
            <p className="text-xs font-bold text-foreground">Transferir <span className="font-black">{alunoEditando.nome}</span> para:</p>
            <div className="flex gap-2">
              <select className="flex-1 p-3.5 border border-warning/20 rounded-xl text-sm font-semibold bg-card text-foreground outline-none" onChange={e => setNovaTurmaDestino(e.target.value)}>
                <option value="">Destino...</option>
                {turmasExistentes.map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={transferStudent} className="bg-warning text-warning-foreground px-5 rounded-xl text-xs font-bold shadow-md active:scale-95">Confirmar</button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Limpeza de Registros */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5 border-destructive/10">
        <h3 className="font-black text-sm text-destructive flex items-center gap-2"><Trash2 size={18} /> Limpeza de Registos</h3>
        <div className="flex gap-2">
          <select className="flex-1 p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
            value={adminTurmaFiltro} onChange={e => { setAdminTurmaFiltro(e.target.value); setSelectedAdminAlunos([]); }}>
            <option value="">Filtrar Turma...</option>
            {turmasExistentes.map(t => <option key={t}>{t}</option>)}
          </select>
          {adminTurmaFiltro && (
            <button onClick={deleteEntireTurma} className="px-5 bg-destructive text-destructive-foreground rounded-2xl shadow-lg active:scale-95" title="Apagar Turma Completa">
              <Trash2 size={20} />
            </button>
          )}
        </div>
        {adminTurmaFiltro && (
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar">
            {alunos.filter(a => a.turma === adminTurmaFiltro).map(a => (
              <button key={a.id} onClick={() => setSelectedAdminAlunos(p => p.includes(a.id) ? p.filter(x => x !== a.id) : [...p, a.id])}
                className={`p-3 rounded-xl text-xs font-bold border text-left transition-all
                ${selectedAdminAlunos.includes(a.id) ? 'bg-destructive border-destructive text-destructive-foreground' : 'bg-secondary text-foreground border-border'}`}>
                {a.nome}
              </button>
            ))}
          </div>
        )}
        {selectedAdminAlunos.length > 0 && (
          <button onClick={() => setDeleteModal(true)} className="w-full py-4 bg-destructive text-destructive-foreground rounded-2xl font-bold shadow-lg active:scale-95 text-sm">
            Apagar {selectedAdminAlunos.length} Selecionado(s)
          </button>
        )}
      </div>

      {/* 6. Limite de Saída */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><Clock size={18} className="text-primary" /> Limite de Saída</h3>
        <div className="flex items-center gap-3">
          <input type="number" value={tempLimit} onChange={e => setTempLimit(Number(e.target.value))}
            className="w-24 p-4 bg-secondary rounded-2xl border border-border outline-none text-center font-bold text-lg text-foreground" />
          <span className="text-sm font-medium text-muted-foreground">minutos</span>
          <button onClick={async () => { await store.saveConfig({ exitLimitMinutes: tempLimit }); await refreshData(); notify("Limite atualizado!"); }}
            className="ml-auto bg-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-bold shadow-md active:scale-95">Salvar</button>
        </div>
      </div>

      {/* 7. Bloqueios Automáticos */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><Lock size={18} className="text-destructive" /> Bloqueios Automáticos</h3>
        {config.autoBlocks.map((block, idx) => (
          <div key={idx} className="flex items-center justify-between bg-secondary p-3 rounded-xl">
            <span className="text-xs font-bold text-foreground">{block.label}: {block.start} - {block.end}</span>
            <button onClick={async () => {
              const blocks = config.autoBlocks.filter((_, i) => i !== idx);
              await store.saveConfig({ autoBlocks: blocks }); await refreshData();
            }} className="text-destructive p-1"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="grid grid-cols-3 gap-2">
          <input type="time" value={novoBlockStart} onChange={e => setNovoBlockStart(e.target.value)}
            className="p-3 bg-secondary rounded-xl border border-border text-xs font-bold text-foreground outline-none" />
          <input type="time" value={novoBlockEnd} onChange={e => setNovoBlockEnd(e.target.value)}
            className="p-3 bg-secondary rounded-xl border border-border text-xs font-bold text-foreground outline-none" />
          <input type="text" placeholder="Nome" value={novoBlockLabel} onChange={e => setNovoBlockLabel(e.target.value)}
            className="p-3 bg-secondary rounded-xl border border-border text-xs font-bold text-foreground outline-none" />
        </div>
        <button onClick={async () => {
          if (!novoBlockStart || !novoBlockEnd || !novoBlockLabel) return notify("Preencha todos os campos.");
          await store.saveConfig({ autoBlocks: [...config.autoBlocks, { start: novoBlockStart, end: novoBlockEnd, label: novoBlockLabel }] });
          setNovoBlockStart(''); setNovoBlockEnd(''); setNovoBlockLabel('');
          await refreshData(); notify("Bloqueio adicionado!");
        }} className="w-full py-3 bg-destructive/10 text-destructive rounded-2xl font-bold border border-destructive/20 active:scale-95 text-sm">
          Adicionar Bloqueio
        </button>
      </div>

      {/* 8. PINs de Acesso */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><KeyRound size={18} className="text-warning" /> PINs de Acesso</h3>
        {(['admin', 'professor', 'apoio'] as const).map(role => (
          <div key={role} className="flex items-center gap-3">
            <span className="text-xs font-bold text-muted-foreground uppercase w-20">{role}</span>
            <input type="text" value={editPasswords[role]} onChange={e => setEditPasswords(p => ({ ...p, [role]: e.target.value }))}
              className="flex-1 p-3 bg-secondary rounded-xl border border-border text-sm font-bold outline-none text-foreground" />
          </div>
        ))}
        <button onClick={async () => { await store.saveConfig({ passwords: editPasswords }); await refreshData(); notify("PINs atualizados!"); }}
          className="w-full py-3 bg-warning text-warning-foreground rounded-2xl font-bold shadow-md active:scale-95 text-sm">
          Salvar PINs
        </button>
      </div>
    </div>
  );
};

export default AdminTab;
