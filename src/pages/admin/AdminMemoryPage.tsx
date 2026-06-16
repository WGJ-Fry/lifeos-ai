import { useEffect, useState } from "react";
import { Brain, Edit3, Plus, RefreshCw, Save, ShieldAlert, Trash2, X } from "lucide-react";
import { MemoryRecord, createMemory, deleteMemory, listMemories, updateMemory } from "../../services/lifeosApi";
import { useI18n } from "../../i18n/I18nProvider";

export default function AdminMemoryPage() {
  const { t } = useI18n();
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sensitivity, setSensitivity] = useState<"normal" | "sensitive">("normal");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setSensitivity("normal");
  };

  const refresh = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await listMemories();
      setMemories(data.memories);
    } catch (err: any) {
      setError(err.message || t("adminMemory.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setError(t("adminMemory.required"));
      return;
    }

    setError(null);
    try {
      if (editingId) {
        await updateMemory(editingId, { title, content, sensitivity });
      } else {
        await createMemory({ title, content, sensitivity });
      }
      resetForm();
      await refresh();
    } catch (err: any) {
      setError(err.message || t("adminMemory.saveFailed"));
    }
  };

  const startEdit = (memory: MemoryRecord) => {
    setEditingId(memory.id);
    setTitle(memory.title);
    setContent(memory.content);
    setSensitivity(memory.sensitivity);
  };

  return (
    <div className="min-h-screen bg-[#060a10] text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <a href="/admin/dashboard" className="text-sm text-zinc-500 hover:text-cyan-300 font-bold">{t("adminMemory.console")}</a>
              <span className="text-zinc-700">/</span>
              <h1 className="text-2xl font-bold">{t("adminMemory.title")}</h1>
            </div>
            <p className="text-sm text-zinc-400 mt-1">{t("adminMemory.description")}</p>
          </div>
          <button onClick={refresh} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-sm font-bold hover:bg-white/[0.06]">
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </button>
        </header>

        {error && <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        <main className="grid lg:grid-cols-[420px_1fr] gap-5">
          <section className="rounded-[28px] border border-white/[0.08] bg-[#101722] p-5 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300 flex items-center justify-center">
                {editingId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              <div>
                <div className="font-bold">{editingId ? t("adminMemory.edit") : t("adminMemory.create")}</div>
                <div className="text-xs text-zinc-500 mt-1">{t("adminMemory.formHint")}</div>
              </div>
            </div>

            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">{t("adminMemory.titleLabel")}</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm outline-none focus:border-cyan-400/60"
              placeholder={t("adminMemory.titlePlaceholder")}
            />

            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 mt-4">{t("adminMemory.contentLabel")}</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="w-full min-h-36 rounded-xl border border-white/[0.08] bg-[#060a10] px-4 py-3 text-sm leading-relaxed outline-none resize-none focus:border-cyan-400/60"
              placeholder={t("adminMemory.contentPlaceholder")}
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => setSensitivity("normal")}
                className={`rounded-xl border py-2.5 text-sm font-bold ${sensitivity === "normal" ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200" : "border-white/[0.08] bg-white/[0.03] text-zinc-400"}`}
              >
                {t("adminMemory.normal")}
              </button>
              <button
                onClick={() => setSensitivity("sensitive")}
                className={`rounded-xl border py-2.5 text-sm font-bold ${sensitivity === "sensitive" ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-white/[0.08] bg-white/[0.03] text-zinc-400"}`}
              >
                {t("adminMemory.sensitiveMemory")}
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={handleSubmit} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3 font-bold text-[#061016]">
                <Save className="w-4 h-4" />
                {editingId ? t("adminMemory.saveChanges") : t("adminMemory.save")}
              </button>
              {editingId && (
                <button onClick={resetForm} className="w-12 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center text-zinc-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/[0.08] bg-[#0b111a] overflow-hidden min-h-[620px]">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div className="font-bold flex items-center gap-2">
                <Brain className="w-4 h-4 text-cyan-300" />
                {t("adminMemory.listTitle")}
              </div>
              <span className="text-xs text-zinc-500">{t("adminMemory.count", { count: memories.length })}</span>
            </div>

            {isLoading ? (
              <div className="p-10 text-center text-sm text-zinc-500">{t("adminMemory.loading")}</div>
            ) : memories.length === 0 ? (
              <div className="p-10 text-center text-sm text-zinc-400 leading-relaxed">
                {t("adminMemory.empty")}
              </div>
            ) : (
              <div className="divide-y divide-white/[0.06]">
                {memories.map((memory) => (
                  <article key={memory.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold truncate">{memory.title}</h3>
                          {memory.sensitivity === "sensitive" && (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-bold text-amber-200">
                              <ShieldAlert className="w-3 h-3" />
                              {t("adminMemory.sensitive")}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed mt-2 whitespace-pre-wrap break-words">{memory.content}</p>
                        <div className="text-xs text-zinc-600 mt-3">{t("adminMemory.updatedAt", { time: new Date(memory.updatedAt).toLocaleString() })}</div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => startEdit(memory)} className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-cyan-200 flex items-center justify-center">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(t("adminMemory.deleteConfirm", { title: memory.title }))) return;
                            await deleteMemory(memory.id);
                            await refresh();
                            if (editingId === memory.id) resetForm();
                          }}
                          className="w-9 h-9 rounded-xl border border-red-400/20 bg-red-500/10 text-red-300 hover:text-red-200 flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
