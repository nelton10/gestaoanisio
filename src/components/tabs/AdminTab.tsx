import React, { useRef } from 'react';
import {
  Download,
  RotateCcw,
  ShieldAlert,
  Database
} from 'lucide-react';
import * as store from '@/lib/store';
import { Aluno, HistoryRecord } from '@/types';

interface AdminTabProps {
  alunos: Aluno[];
  history: HistoryRecord[];
  notify: (msg: string) => void;
  refreshData: () => Promise<void>;
}

const AdminTab: React.FC<AdminTabProps> = ({ alunos, history, notify, refreshData }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backup Geral (JSON)
  const handleFullBackup = () => {
    try {
      const backupData = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        alunos: alunos,
        history: history
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `backup_completo_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      notify("Backup exportado com sucesso!");
    } catch (error: any) {
      console.error("Erro no backup:", error);
      notify(`Erro ao gerar backup: ${error.message}`);
    }
  };

  // Restauração Geral (JSON)
  const handleFullRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ ATENÇÃO: Isso irá APAGAR todos os dados atuais e substituir pelo backup. Deseja continuar?")) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    notify("Iniciando restauração... Não saia desta página.");

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);

        if (!data.alunos || !data.history) {
          throw new Error("Formato de backup inválido.");
        }

        // 1. Limpar dados atuais (Simulado via deletions em massa)
        // Nota: No Supabase, se não houver 'delete all', deletamos pelos IDs existentes
        if (alunos.length > 0) {
          notify("Limpando base de alunos...");
          await store.deleteAlunos(alunos.map(a => a.id));
        }

        // 2. Importar Alunos
        if (data.alunos.length > 0) {
          notify(`Importando ${data.alunos.length} alunos...`);
          for (const aluno of data.alunos) {
            await store.addAluno(aluno);
          }
        }

        // 3. Importar Histórico
        if (data.history.length > 0) {
          notify(`Restaurando ${data.history.length} registros de histórico...`);
          // Para evitar timeouts/limites, podemos importar em lotes se necessário.
          // Aqui tentaremos um por um para garantir que erros sejam capturados.
          for (const record of data.history) {
            await store.addHistoryRecord(record);
          }
        }

        await refreshData();
        notify("✅ Restauração concluída com sucesso!");
      } catch (error: any) {
        console.error("Erro na restauração:", error);
        notify(`❌ ERRO NA RESTAURAÇÃO: ${error.message}`);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      <div className="glass rounded-3xl p-8 shadow-xl border border-white/10 space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
            <Database className="text-primary" size={32} />
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tight">Manutenção do Sistema</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Gerencie a segurança dos seus dados através de backups periódicos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Botão Backup */}
          <button
            onClick={handleFullBackup}
            className="group relative flex flex-col items-center justify-center p-8 bg-secondary/50 hover:bg-secondary rounded-3xl border border-border transition-all hover:scale-[1.02] active:scale-95 space-y-4"
          >
            <div className="p-4 bg-primary/20 rounded-full text-primary group-hover:scale-110 transition-transform">
              <Download size={24} />
            </div>
            <div className="text-center">
              <span className="block font-black text-foreground">Fazer Backup Geral</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Salvar todos os dados</span>
            </div>
          </button>

          {/* Botão Restaurar */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center p-8 bg-destructive/5 hover:bg-destructive/10 rounded-3xl border border-destructive/20 transition-all hover:scale-[1.02] active:scale-95 space-y-4"
          >
            <div className="p-4 bg-destructive/20 rounded-full text-destructive group-hover:scale-110 transition-transform">
              <RotateCcw size={24} />
            </div>
            <div className="text-center">
              <span className="block font-black text-destructive">Restaurar Backup</span>
              <span className="text-[10px] text-destructive/60 uppercase font-bold tracking-widest">Substituir dados atuais</span>
            </div>
          </button>
        </div>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFullRestore}
          className="hidden"
        />

        <div className="bg-warning/10 p-4 rounded-2xl border border-warning/20 flex items-start gap-4">
          <ShieldAlert className="text-warning shrink-0 mt-1" size={20} />
          <div className="space-y-1">
            <p className="text-xs font-bold text-warning uppercase tracking-wider">Atenção</p>
            <p className="text-[11px] text-foreground leading-relaxed">
              Use a restauração apenas se tiver certeza. Este processo substituirá todos os alunos e registros de histórico atuais pelos dados contidos no arquivo de backup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTab;
