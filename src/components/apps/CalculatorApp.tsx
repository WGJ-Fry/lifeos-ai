import { useState, useEffect } from "react";
import { Calculator, Delete, History, Trash2, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSyncedClientState } from "../../hooks/useSyncedClientState";

export default function CalculatorApp() {
  const [display, setDisplay] = useState("0");
  const [history, setHistory] = useSyncedClientState<string[]>("lifeos_calculator_history", ["120 + 24 = 144", "25 * 60 = 1500"]);
  const [showHistory, setShowHistory] = useState(false);

  // Handle keys from natural keyboard
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      const allowedKeys = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "+", "-", "*", "/", "."];
      if (allowedKeys.includes(e.key)) {
        e.preventDefault();
        handlePress(e.key);
      } else if (e.key === "Enter" || e.key === "=") {
        e.preventDefault();
        handleEval();
      } else if (e.key === "Backspace") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [display]);

  const handlePress = (val: string) => {
    if (display === "Error" || display === "Infinity") {
      setDisplay(val);
      return;
    }
    if (display === "0" && val !== ".") {
      setDisplay(val);
    } else {
      // Avoid repetitive decimal points in the active operand
      if (val === ".") {
        const parts = display.split(/[\+\-\*\/]/);
        const lastPart = parts[parts.length - 1];
        if (lastPart.includes(".")) return;
      }
      setDisplay(display + val);
    }
  };

  const handleClear = () => {
    setDisplay("0");
  };

  const handleBackspace = () => {
    if (display === "Error" || display === "Infinity" || display.length <= 1) {
      setDisplay("0");
    } else {
      setDisplay(display.slice(0, -1));
    }
  };

  const handleEval = () => {
    if (display === "0" || display === "Error") return;
    try {
      // Safe-ish evaluation context to prevent exploits or crashes
      const cleanExpr = display.replace(/[^0-9\+\-\*\/\.]/g, "");
      const resultObj = new Function(`return (${cleanExpr})`)();
      
      let formattedResult = String(resultObj);
      if (formattedResult.includes(".") && formattedResult.split(".")[1].length > 5) {
        formattedResult = Number(resultObj).toFixed(5).replace(/\.?0+$/, "");
      }

      // Add to log list
      const record = `${display} = ${formattedResult}`;
      setHistory((prev) => [record, ...prev.slice(0, 19)]); // Keep last 20 records
      setDisplay(formattedResult);
    } catch {
      setDisplay("Error");
    }
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const buttons = [
    { label: "7", type: "num" }, { label: "8", type: "num" }, { label: "9", type: "num" }, { label: "/", type: "op" },
    { label: "4", type: "num" }, { label: "5", type: "num" }, { label: "6", type: "num" }, { label: "*", type: "op" },
    { label: "1", type: "num" }, { label: "2", type: "num" }, { label: "3", type: "num" }, { label: "-", type: "op" },
    { label: "0", type: "num" }, { label: ".", type: "num" }, { label: "=", type: "eq" }, { label: "+", type: "op" }
  ];

  return (
    <div className="flex flex-col h-full bg-[#111113] text-white p-5 font-sans justify-between relative select-none">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 h-10 flex-shrink-0">
        <h3 className="font-semibold text-[14px] flex items-center gap-2">
          <Calculator className="w-4 h-4 text-indigo-400" />
          全天候心流算沙盘
        </h3>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`p-1.5 rounded-lg border transition-colors ${
            showHistory 
              ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400" 
              : "bg-white/[0.01] border-white/[0.04] text-zinc-400 hover:text-zinc-200"
          }`}
          title="运行历史日志"
        >
          <History className="w-4 h-4" />
        </button>
      </div>

      {/* Main Body Grid with sliding History sidebar panel */}
      <div className="flex-1 relative flex flex-col justify-end py-3 overflow-hidden">
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute inset-0 bg-[#111113]/95 backdrop-blur-md z-20 flex flex-col justify-between p-3 rounded-2xl border border-white/[0.05]"
            >
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.04]">
                <span className="text-xs text-zinc-400 font-bold tracking-wider uppercase">运算历史面板</span>
                {history.length > 0 && (
                  <button
                    onClick={clearHistory}
                    className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 font-bold"
                  >
                    <Trash2 className="w-3 h-3" /> 清理日志
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 hide-scrollbar">
                {history.length === 0 ? (
                  <div className="text-xs text-zinc-600 text-center py-10 font-bold">暂无历史运算对账单</div>
                ) : (
                  history.map((record, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        const val = record.split("=")[0].trim();
                        setDisplay(val);
                        setShowHistory(false);
                      }}
                      className="text-right text-xs bg-zinc-800/20 active:bg-zinc-800/40 p-2 rounded-lg cursor-pointer border border-white/[0.02] hover:border-white/[0.08] transition-all font-mono hover:text-indigo-400"
                    >
                      <div className="text-zinc-500 text-[10px] leading-tight truncate">{record.split("=")[0]}</div>
                      <div className="text-zinc-200 font-bold mt-0.5">{record.split("=")[1]}</div>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => setShowHistory(false)}
                className="w-full text-center py-1.5 bg-white/[0.04] text-zinc-300 hover:text-white rounded-lg text-xs font-bold transition-colors"
              >
                返回沙盘
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LED Screen Layout Display */}
        <div className="bg-[#09090b] rounded-[18px] p-4.5 mb-2.5 flex flex-col items-end justify-end border border-white/[0.05] shadow-inner h-[80px] flex-shrink-0">
          <div className="text-[10px] text-zinc-600 font-mono tracking-wider truncate max-w-full">
            {display.match(/[\+\-\*\/]/) ? "表达式就绪" : "直接输入数额或运算符"}
          </div>
          <span className="text-3xl font-light tracking-tight truncate max-w-full font-mono text-zinc-100">
            {display}
          </span>
        </div>
      </div>

      {/* Control row with Clear buttons */}
      <div className="grid grid-cols-4 gap-2 mb-2 flex-shrink-0">
        <button
          onClick={handleClear}
          className="col-span-2 bg-[#d946ef]/10 text-magenta-400 hover:bg-[#d946ef]/25 border border-[#d946ef]/20 transition-all text-xs font-bold py-2.5 rounded-xl uppercase text-indigo-300"
        >
          复位清除 AC
        </button>
        <button
          onClick={handleBackspace}
          className="col-span-2 bg-zinc-800/40 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center gap-1.5 transition-all text-xs font-bold py-2.5 rounded-xl border border-white/[0.03]"
          title="回退一位 (Backspace)"
        >
          <Delete className="w-3.5 h-3.5 text-zinc-400" />
          <span>回退一格</span>
        </button>
      </div>

      {/* Grid Buttons */}
      <div className="grid grid-cols-4 gap-2.5 flex-shrink-0">
        {buttons.map((btn) => (
          <button
            key={btn.label}
            onClick={() => {
              if (btn.type === "eq") {
                handleEval();
              } else {
                handlePress(btn.label);
              }
            }}
            className={`py-3.5 rounded-xl text-md font-bold transition-all active:scale-95 text-center font-mono ${
              btn.type === "eq"
                ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10"
                : btn.type === "op"
                  ? "bg-indigo-600/15 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/10"
                  : "bg-zinc-800/25 border border-white/[0.02] hover:bg-zinc-800 text-zinc-200"
            }`}
          >
            {btn.label === "*" ? "×" : btn.label === "/" ? "÷" : btn.label}
          </button>
        ))}
      </div>

      {/* Touch keyboard guides footer stats */}
      <div className="text-[10px] text-zinc-600 text-center pt-2 font-medium flex-shrink-0">
        集成全盘硬编码映射，支持键盘物理键位随时直接录入
      </div>

    </div>
  );
}
