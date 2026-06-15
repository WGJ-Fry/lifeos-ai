import { useState, useMemo, useEffect, useRef, DragEvent, ChangeEvent, KeyboardEvent } from "react";
import { CustomApp } from "../../types";
import { motion, AnimatePresence } from "motion/react";
import { useSyncedClientState } from "../../hooks/useSyncedClientState";
import { formatHtmlLikeCode } from "./studio/codeUtils";
import { analyzeFile, generateStudioApp, refineCode } from "./studio/api";
import StudioByokTab from "./studio/StudioByokTab";
import StudioSidebar, { StudioTab } from "./studio/StudioSidebar";
import StudioEditorHeader from "./studio/StudioEditorHeader";
import StudioShellHeader from "./studio/StudioShellHeader";
import StudioDragOverlay from "./studio/StudioDragOverlay";
import StudioDeveloperEditor from "./studio/StudioDeveloperEditor";
import StudioImportWizardModal from "./studio/StudioImportWizardModal";
import StudioMemoryTab from "./studio/StudioMemoryTab";
import StudioOverviewTab from "./studio/StudioOverviewTab";
import StudioProxyTab from "./studio/StudioProxyTab";
import StudioRefinePanel from "./studio/StudioRefinePanel";
import StudioResponsivePreview from "./studio/StudioResponsivePreview";
import StudioSettingsTab from "./studio/StudioSettingsTab";
import { useStudioSimulatorState } from "./studio/useStudioSimulatorState";
import { useStudioConnectionSettings } from "./studio/useStudioConnectionSettings";
import StudioWorkshopTab from "./studio/StudioWorkshopTab";

export default function StudioApp({ 
  customApps, 
  onClose,
  onUpdateCode,
  onDeleteApp,
  onOpenApp,
  onAddApp
}: { 
  customApps: CustomApp[], 
  onClose: () => void,
  onUpdateCode: (id: string, code: string) => void,
  onDeleteApp?: (id: string) => void,
  onOpenApp?: (id: string) => void,
  onAddApp?: (app: CustomApp) => void
}) {
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StudioTab>("overview");

  // Local buffered states for code editor & preview sandbox
  const [localCode, setLocalCode] = useState("");
  const [runningCode, setRunningCode] = useState("");
  const [editorActiveTab, setEditorActiveTab] = useState<"code" | "guide">("code");

  // States for the external application integration wizard (AI Conversational App Builder)
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);
  const [wizardAppName, setWizardAppName] = useState("");
  const [promptInput, setPromptInput] = useState("");
  const [isGeneratingApp, setIsGeneratingApp] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // States for dragging files & AI analysis
  const [isDragging, setIsDragging] = useState(false);

  // States for prompt-based quick AI refinement (No-code conversational editing)
  const [refineInstruction, setRefineInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [showRawEditor, setShowRawEditor] = useState<boolean>(false);
  const {
    appendSimulatorLog,
    captureRefineVersion,
    isLandscape,
    previewDevice,
    refineHistory,
    resetForSelectedApp,
    resetSimulatorLogs,
    setIsLandscape,
    setPreviewDevice,
    showConsole,
    simulatorLogs,
    toggleConsole,
  } = useStudioSimulatorState();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const installGeneratedApp = (name: string, description: string, code: string) => {
    if (!code.trim()) {
      throw new Error("AI 未返回可安装的微应用代码");
    }

    const generatedApp: CustomApp = {
      id: "custom-" + Date.now().toString(),
      name: name || "智能重构应用",
      description: description || "由 JARVIS 分析并重构生成的本地微应用。",
      visibility: "private",
      status: "active",
      createdAt: Date.now(),
      code: code.trim(),
    };

    if (onAddApp) {
      onAddApp(generatedApp);
    }

    setLocalCode(generatedApp.code);
    setRunningCode(generatedApp.code);
    setEditingAppId(generatedApp.id);
    setIsImportWizardOpen(false);
    setPromptInput("");
    setWizardAppName("");
    appendSimulatorLog({ time: "SYSTEM", text: `AI 微应用 “${generatedApp.name}” 已创建并载入编辑器。`, type: "info" });
  };

  const processImportedFile = async (file: File) => {
    setGenerationError(null);
    setIsGeneratingApp(true);
    setIsImportWizardOpen(true);
    setWizardAppName("智能分析中...");
    setPromptInput(`正在分析 ${file.name} 并重构为可安装微应用。`);

    try {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();

      if (isImage) {
        reader.onload = async (event) => {
          try {
            const dataUrl = event.target?.result as string;
            const base64Data = dataUrl.split(",")[1];
            
            const data = await analyzeFile({
              fileName: file.name,
              fileImageBase64: base64Data,
              mimeType: file.type,
            });
            installGeneratedApp(
              data.appName || "已识别的视觉卡片",
              data.description || "根据您的原型截图，AI 已完成还原、适配并注入运行脚本。",
              data.uiCode || "",
            );
          } catch (err: any) {
            console.error(err);
            setGenerationError(err.message || "解析过程出错");
            setWizardAppName("AI 辨识失败");
          } finally {
            setIsGeneratingApp(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Text/HTML
        reader.onload = async (event) => {
          try {
            const textContent = event.target?.result as string;
            
            const data = await analyzeFile({
              fileName: file.name,
              fileContent: textContent,
            });
            installGeneratedApp(
              data.appName || "智能重构应用",
              data.description || "已由智能管家无缝迁移和优化重构。",
              data.uiCode || "",
            );
          } catch (err: any) {
            console.error(err);
            setGenerationError(err.message || "解析源码出错");
            setWizardAppName("重构编译遇到问题");
          } finally {
            setIsGeneratingApp(false);
          }
        };
        reader.readAsText(file);
      }
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "无法读取本地文件");
      setIsGeneratingApp(false);
    }
  };

  const handleFileDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processImportedFile(file);
    }
  };

  const handleFileInputChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processImportedFile(file);
    }
  };

  const handleGenerateAppByAI = async () => {
    if (!promptInput.trim()) return;
    setIsGeneratingApp(true);
    setGenerationError(null);
    try {
      const finalAppName = wizardAppName.trim() || promptInput.trim().substring(0, 10) + "...";
      const data = await generateStudioApp({
        appName: finalAppName,
        description: promptInput.trim()
      });
      if (!data.uiCode) {
        throw new Error("AI 未能成功生成组件代码，请更换需求重试");
      }

      installGeneratedApp(data.appName || finalAppName, promptInput.trim(), data.uiCode);
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "智能生成出错");
    } finally {
      setIsGeneratingApp(false);
    }
  };

  const handleRefineCode = async () => {
    if (!refineInstruction.trim()) return;
    setIsRefining(true);
    setRefineError(null);
    try {
      const data = await refineCode({
        currentCode: localCode,
        instruction: refineInstruction,
      });
      if (data.refinedCode) {
        captureRefineVersion(refineInstruction, localCode);

        // Inject system console initialization log for sandbox
        appendSimulatorLog({ time: "COMPILER", text: `🔄 编译更新成功: “${refineInstruction.trim().substring(0, 20)}${refineInstruction.length > 20 ? "..." : ""}”`, type: "info" });

        setLocalCode(data.refinedCode);
        setRunningCode(data.refinedCode); // Immediately refresh iframe simulation
        setRefineInstruction("");
      } else {
        throw new Error("AI 返回了空白代码，请重新描述您的修改需求");
      }
    } catch (err: any) {
      console.error(err);
      setRefineError(err.message || "代码重构失败");
    } finally {
      setIsRefining(false);
    }
  };

  // Sync edit app change automatically to the local buffer and clear temporary history
  useEffect(() => {
    if (editingAppId) {
      const targetApp = customApps.find(a => a.id === editingAppId);
      if (targetApp) {
        setLocalCode(targetApp.code || "");
        setRunningCode(targetApp.code || "");
        resetForSelectedApp(targetApp);
      }
    } else {
      setLocalCode("");
      setRunningCode("");
      resetForSelectedApp();
    }
  }, [editingAppId, customApps, resetForSelectedApp]);

  const prettifyCode = () => {
    if (!localCode) return;
    try {
      setLocalCode(formatHtmlLikeCode(localCode));
      appendSimulatorLog({ time: "PRETTIER", text: "已自动整理源代码空行与逻辑缩进 (Format Completed)", type: "info" });
    } catch (e) {
      console.error("Format Failed:", e);
    }
  };
  
  const handleTextareaKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Support Ctrl + S (or Cmd + S) to compile and render instantly in Sandbox
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      setRunningCode(localCode);
      if (editingAppId) {
        onUpdateCode(editingAppId, localCode);
      }
      appendSimulatorLog({ time: "COMPILER", text: "⚡ 已捕获保存热键 (Ctrl+S)，开始自诊断重载微应用...", type: "info" });
    }
    // Support Tab key to insert double spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = localCode.substring(0, start) + "  " + localCode.substring(end);
      setLocalCode(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  // Dynamic Habits and Memories
  const [memories, setMemories] = useSyncedClientState<any[]>("lifeos_memories", [
    { id: "mem-1", title: "用户称呼与代词", time: "记忆于 1周前", content: "“先生/主人，男士，职场人士，讲话干脆直接不要罗嗦。”", type: "user" },
    { id: "mem-2", title: "晨间常驻导航点", time: "记忆于 3天前", content: "“早晨常去的星巴克门店在南京西路110号。”", type: "location" },
    { id: "mem-3", title: "UI审美偏好", time: "系统自动提取", content: "“喜爱深色系、Cyberpunk 以及极简的控制台风格，避免花哨色彩。”", type: "ui" }
  ]);

  const [newMemTitle, setNewMemTitle] = useState("");
  const [newMemContent, setNewMemContent] = useState("");
  const [isAddingMem, setIsAddingMem] = useState(false);

  // Model Engine & TTS Voice States
  const [modelEngine, setModelEngine] = useSyncedClientState("lifeos_model_engine", "Gemini 2.0 Flash");
  const [ttsVoice, setTtsVoice] = useSyncedClientState("lifeos_tts_voice", "Onyx (深沉星空男声)");

  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
  };

  const handleAddMemory = () => {
    if (!newMemTitle.trim() || !newMemContent.trim()) {
      alert("请填写完整的标题和内容后提交。");
      return;
    }
    const newMem = {
      id: "mem-" + Date.now(),
      title: newMemTitle.trim(),
      time: "手动添加 刚刚",
      content: `“${newMemContent.trim()}”`,
      type: "custom"
    };
    const updated = [newMem, ...memories];
    setMemories(updated);
    setNewMemTitle("");
    setNewMemContent("");
    setIsAddingMem(false);
  };

  const handleClearAllData = () => {
    if (window.confirm("⚠️ 确定要彻底擦除所有端侧历史、大模型密钥及中继网络订阅吗？该操作不可逆。")) {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("lifeos_") || key.startsWith("omnipreview_"))
        .forEach((key) => localStorage.removeItem(key));
      alert("所有的本地资产及存储状态已被完全擦除，系统已恢复至最纯净的白纸状态。即将刷新应用以重载默认值。");
      window.location.reload();
    }
  };

  const handleBackupData = () => {
    const backupObject = {
      customApps,
      memories,
      byokProvider,
      byokKey,
      proxyEnabled,
      proxyUrl,
      routeMode,
      selectedNodeId,
      proxyNodes,
      modelEngine,
      ttsVoice,
      backupTime: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backupObject, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lifeos_assets_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const {
    apiTestResult,
    apiTestStatus,
    byokKey,
    byokProvider,
    handleKeyChange,
    handleProviderChange,
    handleProxyUrlChange,
    handleRouteModeChange,
    handleSelectNode,
    isPinging,
    isSyncingSub,
    proxyEnabled,
    proxyNodes,
    proxyUrl,
    routeMode,
    selectedNodeId,
    setProxyEnabled,
    subSyncResult,
    syncSubscription,
    testAllPings,
    testApiConnection,
    toggleProxy,
  } = useStudioConnectionSettings();
  
  const activeAppToEdit = customApps.find(a => a.id === editingAppId);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(localCode);
      alert("📋 代码已复制到剪贴板！您可以随时在其他编辑器中使用它。");
    } catch (err) {
      alert("复制失败，您的浏览器可能未启用剪贴板 API 授权。");
    }
  };

  return (
    <div 
      className="flex h-screen bg-[#050505] text-zinc-300 overflow-hidden relative font-sans w-full"
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
    >
      {isDragging && (
        <StudioDragOverlay
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
        />
      )}

      {/* Sidebar navigation */}
      <StudioSidebar activeTab={activeTab} customApps={customApps} onSelectTab={setActiveTab} />

      {/* Main Workspace Frame panel (Responsive Flex) */}
      <div className="flex-1 flex flex-col h-full bg-[#050505]/30 relative overflow-hidden">
        <StudioShellHeader onClose={onClose} />

        {/* Dynamic Inner Tab scrolling body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 scroll-smooth">
          <AnimatePresence mode="wait">

            {/* OVERVIEW TAB */}
            {activeTab === "overview" && (
              <StudioOverviewTab
                customApps={customApps}
                memoriesCount={memories.length}
                modelEngine={modelEngine}
                ttsVoice={ttsVoice}
                proxyEnabled={proxyEnabled}
                proxyNodes={proxyNodes}
                selectedNodeId={selectedNodeId}
                simulatorLogs={simulatorLogs}
                showConsole={showConsole}
                onResetLogs={resetSimulatorLogs}
                onToggleConsole={toggleConsole}
                onOpenSettings={() => setActiveTab("settings")}
              />
            )}

            {activeTab === "workshop" && (
              <StudioWorkshopTab
                customApps={customApps}
                fileInputRef={fileInputRef}
                onClose={onClose}
                onFileInputChange={handleFileInputChange}
                onOpenImportWizard={() => {
                  setWizardAppName("");
                  setPromptInput("");
                  setIsImportWizardOpen(true);
                }}
                onOpenApp={onOpenApp}
                onDeleteApp={onDeleteApp}
                onEditApp={(app) => {
                  setEditingAppId(app.id);
                  setLocalCode(app.code || "");
                  setRunningCode(app.code || "");
                }}
              />
              )}

              <StudioImportWizardModal
                isOpen={isImportWizardOpen}
                isGenerating={isGeneratingApp}
                appName={wizardAppName}
                promptInput={promptInput}
                error={generationError}
                onClose={() => setIsImportWizardOpen(false)}
                onAppNameChange={setWizardAppName}
                onPromptInputChange={setPromptInput}
                onGenerate={handleGenerateAppByAI}
              />
              {/* MEMORY BANK TAB */}
              {activeTab === "memory" && (
                <StudioMemoryTab
                  memories={memories}
                  isAddingMemory={isAddingMem}
                  newMemoryTitle={newMemTitle}
                  newMemoryContent={newMemContent}
                  onStartAdding={() => setIsAddingMem(true)}
                  onCancelAdding={() => setIsAddingMem(false)}
                  onChangeTitle={setNewMemTitle}
                  onChangeContent={setNewMemContent}
                  onAddMemory={handleAddMemory}
                  onDeleteMemory={handleDeleteMemory}
                />
             )}

             {/* BYOK TAB */}
             {activeTab === "byok" && (
                <StudioByokTab
                  provider={byokProvider}
                  apiKey={byokKey}
                  apiTestStatus={apiTestStatus}
                  apiTestResult={apiTestResult}
                  onProviderChange={handleProviderChange}
                  onKeyChange={handleKeyChange}
                  onTestConnection={testApiConnection}
                />
             )}

             {/* PROXY TAB */}
             {activeTab === "proxy" && (
                <StudioProxyTab
                  proxyEnabled={proxyEnabled}
                  proxyUrl={proxyUrl}
                  routeMode={routeMode}
                  selectedNodeId={selectedNodeId}
                  proxyNodes={proxyNodes}
                  isSyncingSub={isSyncingSub}
                  isPinging={isPinging}
                  subSyncResult={subSyncResult}
                  onToggleProxy={toggleProxy}
                  onProxyUrlChange={handleProxyUrlChange}
                  onSyncSubscription={syncSubscription}
                  onSetProxyEnabled={setProxyEnabled}
                  onSelectNode={handleSelectNode}
                  onRouteModeChange={handleRouteModeChange}
                  onTestAllPings={testAllPings}
                />
              )}
              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <StudioSettingsTab
                  modelEngine={modelEngine}
                  ttsVoice={ttsVoice}
                  onModelEngineChange={setModelEngine}
                  onTtsVoiceChange={setTtsVoice}
                  onClearAllData={handleClearAllData}
                  onBackupData={handleBackupData}
                />
               )}
            </AnimatePresence>
          </div>
        </div>

      <AnimatePresence>
        {activeAppToEdit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-2 md:inset-6 bg-[#050505]/98 backdrop-blur-3xl z-50 rounded-[32px] border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            <StudioEditorHeader
              appName={activeAppToEdit.name}
              showRawEditor={showRawEditor}
              onCopy={handleCopyToClipboard}
              onToggleRawEditor={() => setShowRawEditor(!showRawEditor)}
              onCancel={() => setEditingAppId(null)}
              onPublish={() => {
                onUpdateCode && onUpdateCode(activeAppToEdit.id, localCode);
                setEditingAppId(null);
                alert(`组件《${activeAppToEdit.name}》编译通过并成功更新！已全量上架部署，欢迎回到管家主面板体验运行。`);
              }}
            />

            {/* Main Sandbox Workspace Area */}
            <div className="flex-1 flex overflow-hidden min-h-0 bg-[#0a0a0c]">
               {!showRawEditor ? (
                 <>
                    <StudioRefinePanel
                      instruction={refineInstruction}
                      isRefining={isRefining}
                      refineError={refineError}
                      refineHistory={refineHistory}
                      onInstructionChange={setRefineInstruction}
                      onRefine={handleRefineCode}
                      onRollback={(version) => {
                        setLocalCode(version.code);
                        setRunningCode(version.code);
                        appendSimulatorLog({ time: "ROLLBACK", text: `已回滚至变动: ${version.instruction.substring(0, 15)}...`, type: "info" });
                      }}
                    />

                    <StudioResponsivePreview
                      runningCode={runningCode}
                      refineInstruction={refineInstruction}
                      isRefining={isRefining}
                      previewDevice={previewDevice}
                      isLandscape={isLandscape}
                      simulatorLogs={simulatorLogs}
                      showConsole={showConsole}
                      onPreviewDeviceChange={setPreviewDevice}
                      onLandscapeChange={setIsLandscape}
                      onAppendSimulatorLog={appendSimulatorLog}
                      onResetLogs={resetSimulatorLogs}
                      onToggleConsole={toggleConsole}
                    />
                  </>
                ) : (
                  <StudioDeveloperEditor
                    editorActiveTab={editorActiveTab}
                    localCode={localCode}
                    runningCode={runningCode}
                    refineInstruction={refineInstruction}
                    isRefining={isRefining}
                    refineError={refineError}
                    onEditorActiveTabChange={setEditorActiveTab}
                    onLocalCodeChange={setLocalCode}
                    onRunningCodeChange={setRunningCode}
                    onRefineInstructionChange={setRefineInstruction}
                    onRefine={handleRefineCode}
                    onPrettifyCode={prettifyCode}
                    onTextareaKeyDown={handleTextareaKeyDown}
                  />
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
