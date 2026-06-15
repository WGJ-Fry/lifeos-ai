import { CustomApp } from "../../types";
import { STUDIO_IFRAME_SANDBOX, buildStudioSandboxSrcDoc } from "./studio/sandbox";

type CustomAppFrameProps = {
  app: CustomApp;
};

export default function CustomAppFrame({ app }: CustomAppFrameProps) {
  return (
    <div className="w-full min-h-[360px] bg-[#0a0a0a] pointer-events-auto relative">
      <iframe
        srcDoc={buildStudioSandboxSrcDoc(app.code || "")}
        title={app.name}
        className="absolute inset-0 w-full h-full border-none"
        sandbox={STUDIO_IFRAME_SANDBOX}
      />
    </div>
  );
}
