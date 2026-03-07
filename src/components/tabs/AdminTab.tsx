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
  Download, // Ícone de exportação
  Clock,
  RotateCcw,
  History // Ícone para a seção de ocorrências
} from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, AppConfig } from '@/types';

interface AdminTabProps {
  alunos: Aluno[];
  config: AppConfig;
  history: any[]; // Adicionado para gerenciar as ocorrências
  turmasExistentes: string[];
  notify: (msg: string) => void;
  refreshData: () => void;
}

const AdminTab: React.FC<AdminTabProps> = ({ alunos, config, history, turmasExistentes, notify, refreshData }) => {
  // States existentes
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
  
  // Refs para os inputs de ficheiro
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE ALUNOS ---
  const addStudent = () => {
    if (!nomeNovoAluno || !turmaNovoAluno) return notify("Preencha nome e turma.");
    const novo = { id: store.generateId(), nome: nomeNovoAluno.toUpperCase(), turma: turmaNovoAluno.toUpperCase() };
    store.saveConfig({ alunosList: [...alunos, novo] });
    setNomeNovoAluno(''); setTurmaNovoAluno(''); setModoNovaTurma(false);
    refreshData(); notify("Aluno adicionado!");
  };

  const deleteSelected = () => {
    if (!selectedAdminAlunos.length) return;
    store.saveConfig({ alunosList: alunos.filter(a => !selectedAdminAlunos.includes(a.id)) });
    setSelectedAdminAlunos([]); setDeleteModal(false);
    refreshData(); notify("Alunos removidos!");
  };

  const deleteEntireTurma = () => {
    if (!adminTurmaFiltro) return;
    if (confirm(`PERIGO: Você está prestes a apagar TODOS os alunos da turma ${adminTurmaFiltro}. Confirma?`)) {
      store.saveConfig({ alunosList: alunos.filter(a => a.turma !== adminTurmaFiltro) });
      setAdminTurmaFiltro(''); setSelectedAdminAlunos([]);
      refreshData(); notify(`Turma ${adminTurmaFiltro} removida!`);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = (evt.target?.result as string).split('\n');
      const newAlunos: Aluno[] = [];
      lines.forEach((line, idx) => {
        if (idx === 0 && line.toLowerCase().includes('turma')) return;
        const parts = line.split(',');
        if (parts.length >= 2) {
          const t = parts[0].trim().toUpperCase();
          const n = parts[1].trim().toUpperCase();
          if (t && n) newAlunos.push({ id: store.generateId(), nome: n, turma: t });
        }
      });
      if (newAlunos.length) {
        const final = isRestoreMode ? newAlunos : [...alunos, ...newAlunos];
        store.saveConfig({ alunosList: final });
        refreshData(); notify(isRestoreMode ? "Base de alunos restaurada!" : "Alunos importados!");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- LÓGICA DE OCORRÊNCIAS (NOVO) ---
  const exportOcorrencias = () => {
    if (!history.length) return notify("Não há ocorrências para exportar.");
    
    // Cabeçalho conforme seus arquivos de backup
    let csv = "DATA,TURMA,NOME,DESCRIÇÃO\n";
    
    history.forEach(item => {
      const data = `"${item.data || ''}"`; // Aspas para conter a vírgula da data
      const turma = item.turma || '';
      const nome = item.nome || '';
      const desc = `"${(item.descricao || '').replace(/"/g, '""')}"`; // Escapa aspas internas
      csv += `${data},${turma},${nome},${desc}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `backup_ocorrencias_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Exportação concluída!");
  };

  const restoreOcorrencias = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const lines = content.split('\n');
      const restoredHistory: any[] = [];

      lines.forEach((line, idx) => {
        if (idx === 0 || !line.trim()) return; // Pula cabeçalho ou linhas vazias
        
        // Regex para separar por vírgula respeitando aspas
        const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        
        if (parts && parts.length >= 4) {
          restoredHistory.push({
            id: store.generateId(),
            data: parts[0].replace(/"/g, ''),
            turma: parts[1],
            nome: parts[2],
            descricao: parts[3].replace(/"/g, ''),
            timestamp: Date.now() // Timestamp aproximado para ordenação
          });
        }
      });

      if (restoredHistory.length) {
        store.saveConfig({ history: restoredHistory });
        refreshData();
        notify(`${restoredHistory.length} ocorrências restauradas!`);
      }
      if (historyInputRef.current) historyInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Modal de Confirmação para Alunos */}
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

      {/* Seção de Alunos - Igual ao anterior */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-5">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><UserPlus size={18} className="text-primary" /> Novo Aluno</h3>
        <input type="text" placeholder="Nome Completo" className="w-full p-4 bg-secondary rounded-2xl border border-border outline-none"
          value={nomeNovoAluno} onChange={e => setNomeNovoAluno(e.target.value)} />
        <div className="flex gap-2.5">
          <select className="flex-1 p-4 bg-secondary rounded-2xl border border-border outline-none font-semibold text-foreground appearance-none"
            value={turmaNovoAluno} onChange={e => setTurmaNovoAluno(e.target.value)}>
            <option value="">Escolher Turma...</option>
            {turmasExistentes.map(t => <option key={t}>{t}</option>)}
          </select>
          <button onClick={() => setModoNovaTurma(!modoNovaTurma)} className="bg-secondary p-4 rounded-2xl">
            <PlusCircle size={20} />
          </button>
        </div>
        {modoNovaTurma && <input type="text" placeholder="Criar Turma (Ex: 9A)" className="w-full p-4 bg-card border-2 border-primary/30 rounded-2xl outline-none"
          value={turmaNovoAluno} onChange={e => setTurmaNovoAluno(e.target.value)} />}
        <button onClick={addStudent} className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold">Adicionar</button>
      </div>

      {/* Seção CSV Alunos */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><FileUp size={18} className="text-primary" /> Base de Alunos (CSV)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={() => { setIsRestoreMode(false); fileInputRef.current?.click(); }} 
            className="py-4 bg-secondary text-foreground rounded-2xl font-bold border border-border text-sm flex items-center justify-center gap-2">
            <FileUp size={16} /> Importar
          </button>
          <button onClick={() => { if(confirm("Apagar todos os alunos e substituir?")) { setIsRestoreMode(true); fileInputRef.current?.click(); } }} 
            className="py-4 bg-destructive/10 text-destructive rounded-2xl font-bold border border-destructive/20 text-sm flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Restaurar
          </button>
        </div>
        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCsvUpload} className="hidden" />
      </div>

      {/* --- NOVO: SEÇÃO DE OCORRÊNCIAS --- */}
      <div className="glass rounded-3xl p-6 shadow-lg space-y-4">
        <h3 className="font-black text-sm flex items-center gap-2 text-foreground"><History size={18} className="text-warning" /> Histórico de Ocorrências</h3>
        <p className="text-xs text-muted-foreground italic">Formato compatível com: SAIDA, ATRASO, OCORRENCIA</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={exportOcorrencias} 
            className="py-4 bg-secondary text-foreground rounded-2xl font-bold border border-border text-sm flex items-center justify-center gap-2">
            <Download size={16} /> Exportar CSV
          </button>
          <button onClick={() => { if(confirm("Isso substituirá TODO o histórico atual pelo arquivo. Continuar?")) historyInputRef.current?.click(); }} 
            className="py-4 bg-warning/10 text-warning rounded-2xl font-bold border border-warning/20 text-sm flex items-center justify-center gap-2">
            <RotateCcw size={16} /> Restaurar CSV
          </button>
        </div>
        <input type="file" accept=".csv" ref={historyInputRef} onChange={restoreOcorrencias} className="hidden" />
      </div>

      {/* Outras seções (Transferência, Limpeza, etc.) permanecem iguais conforme seu código anterior */}
      {/* ... */}
    </div>
  );
};

export default AdminTab;
