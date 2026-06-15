import { Code2 } from "lucide-react";
import { STUDIO_IFRAME_SANDBOX, buildStudioSandboxSrcDoc } from "./sandbox";

type StudioSandboxPreviewProps = {
  code: string;
  frameKey: string | number;
  emptyTitle: string;
  emptySubtitle?: string;
};

export default function StudioSandboxPreview({ code, frameKey, emptyTitle, emptySubtitle }: StudioSandboxPreviewProps) {
  if (code) {
    return (
      <iframe
        key={frameKey}
        srcDoc={buildStudioSandboxSrcDoc(code)}
        title="Sandbox Preview"
        className="absolute inset-0 w-full h-full border-none"
        sandbox={STUDIO_IFRAME_SANDBOX}
      />
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 text-xs p-6 text-center">
      <Code2 className="w-8 h-8 mb-2 text-zinc-700 animate-pulse" />
      <span>{emptyTitle}</span>
      {emptySubtitle ? <span className="text-[10px] text-zinc-700 mt-1">{emptySubtitle}</span> : null}
    </div>
  );
}
