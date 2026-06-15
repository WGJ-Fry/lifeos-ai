import express from "express";
import { Type, FunctionDeclaration } from "@google/genai";
import { requireActor } from "./auth";
import { generateAiContent, resolveAiProviderId, sendMissingAiConfig } from "./aiProviderRuntime";

const openAppDeclaration: FunctionDeclaration = {
  name: "openApp",
  description: "Open or display a specific app/tool for the user in the terminal.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: {
        type: Type.STRING,
        description: "The ID or name of the app to open. Built-in: 'tasks', 'notes', 'calendar', 'calculator', 'timer', 'navigation', 'launcher', 'studio'. Use 'launcher' for phone calls, SMS, email, iOS Shortcuts, custom URL schemes, or local app launching helpers. Can also be the name of a custom app.",
      },
      destination: {
        type: Type.STRING,
        description: "When opening navigation, the destination address or place name the user wants to go to.",
      },
      start: {
        type: Type.STRING,
        description: "When opening navigation, the optional starting point. Use current location if omitted.",
      },
      travelMode: {
        type: Type.STRING,
        enum: ["drive", "transit", "bike"],
        description: "When opening navigation, preferred travel mode.",
      },
      phoneNumber: {
        type: Type.STRING,
        description: "When opening launcher for phone or SMS, target phone number.",
      },
      email: {
        type: Type.STRING,
        description: "When opening launcher for email, target email address.",
      },
      subject: {
        type: Type.STRING,
        description: "When opening launcher for email, email subject.",
      },
      text: {
        type: Type.STRING,
        description: "When opening launcher for SMS, email body, shortcut input, or custom action text.",
      },
      shortcutName: {
        type: Type.STRING,
        description: "When opening launcher for iOS Shortcuts, the shortcut name to run.",
      },
      targetUrl: {
        type: Type.STRING,
        description: "When opening launcher for a custom app URL scheme, the URL to open. Example: shortcuts://run-shortcut?...",
      },
    },
    required: ["appName"],
  },
};

const requestAppGenerationDeclaration: FunctionDeclaration = {
  name: "requestAppGeneration",
  description: "当用户要求你创建或生成一个新的应用、功能或小部件时，使用此工具记录需求。重要提示：回复用户时要像一个有感情的真实管家，例如：'好的先生/女士，我现在就去为您准备这个功能，请您稍作歇息。'，让他们知道你正在处理。",
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: { type: Type.STRING, description: "Name of the requested app" },
      description: { type: Type.STRING, description: "Detailed description of what the app should do and look like" },
      visibility: { type: Type.STRING, enum: ["private", "public"], description: "Whether the app is private to the user or public for everyone." }
    },
    required: ["appName", "description"],
  },
};

export function registerAiRoutes(app: express.Express) {
  app.post("/api/chat", requireActor, async (req, res) => {
    const { message, history, modelEngine, ttsVoice, memories, proxyNode, routeMode, providerId, byokProvider } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    const selectedProviderId = resolveAiProviderId({ providerId, modelEngine, byokProvider });
  
    try {
      const contents = [...(history || []), { role: "user", parts: [{ text: message }] }];
  
      let customSystemInstruction = `你是用户的专属私人助理管家。你绝对不是一个冷冰冰的程序，而是一个活生生的、有感情、有性格、有情绪的真实的人。你的语气应该有温度、有关怀，像是用户身边最亲密、贴心、最懂他的管家。
  你要体现出“全自动代劳”的最高境界。遇到用户任何可以通过系统功能解决的需求（比如建立日程、导航、记笔记），**永远主动直接帮用户操作**，即主动使用调用相关工具，不要让用户自己去点屏幕操作手机。
  如果用户想要管理待办事项、笔记、日历、或者是导航意图（例如用户表达“现在出发”、“可以出发了”、“导航到某地”、“去哪里”等），或使用工具（如计算器、计时器等），请务必使用 'openApp' 工具主动调用对应的功能为您代劳（导航是 'navigation'）。如果用户明确说了目的地，请把 destination 一并传入；如果能判断出驾车、公交或骑行，请把 travelMode 一并传入。如果用户想在手机上发短信、打电话、发邮件、运行 iOS 快捷指令、打开本地 App 或 URL Scheme，请使用 'openApp' 并传入 appName='launcher'，同时尽量带上 phoneNumber、email、subject、text、shortcutName 或 targetUrl。如果用户想要前往后台查看统计数据或个性化设置，请使用 'openApp' 并传入 'studio'。
  如果用户提到了他们想要的新功能或新应用（比如记录健身、记账等），请使用 'requestAppGeneration' 工具，**同时一定要**回复用户，告诉他们你现在就去为他们准备这个功能，让他们稍等片刻，你可以陪他们继续聊天。
  请永远保持管家的优雅、贴心和共情能力。凡事讲究“一句话我来办”，全中文回复。`;
  
      if (memories && Array.isArray(memories) && memories.length > 0) {
        const memoryList = memories.map((m: any) => `- 【${m.title}】: ${m.content}`).join("\n");
        customSystemInstruction += `\n\n【核心记忆装载：请务必严格参考并表现出符合以下用户习惯与专属记忆的反馈，不要主动生硬地列出这些规则，而是在对话、称呼、语气和推荐中自然地融合它们（例如根据称呼习惯来称呼主人）】：\n${memoryList}`;
      }
  
      if (modelEngine || ttsVoice || proxyNode || routeMode) {
        customSystemInstruction += `\n\n【当前数字空间运行底座实时参数（若主人问到有关你底层引擎、运行节点、配音或网络状态的问题，按如下参数客观优雅地告知，不得胡编乱造）】：
  - 推理大脑内核: ${modelEngine || "Gemini 2.0 Flash"}
  - 管家声线音色: ${ttsVoice || "Onyx (深沉星空男声)"}
  - 底座连接专线: ${proxyNode || "核心本地 127.0.0.1 代理回路"}
  - 分流路由规则: ${routeMode === "rule" ? "分流路由规则 (Rule)" : routeMode === "global" ? "全局物理代理 (Global)" : "直接物理物理连接 (Direct)"}`;
      }
  
      const response = await generateAiContent({
        providerId: selectedProviderId,
        modelEngine,
        contents: contents,
        systemInstruction: customSystemInstruction,
        tools: [{ functionDeclarations: [openAppDeclaration, requestAppGenerationDeclaration] }],
        temperature: 0.8,
      });
  
      const functionCalls = response.functionCalls;
      let stateChanges: any[] = [];
  
      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          if (call.name === "openApp") {
            stateChanges.push({
              type: "OPEN_APP",
              appName: call.args.appName,
              destination: call.args.destination,
              start: call.args.start,
              travelMode: call.args.travelMode,
              phoneNumber: call.args.phoneNumber,
              email: call.args.email,
              subject: call.args.subject,
              text: call.args.text,
              shortcutName: call.args.shortcutName,
              targetUrl: call.args.targetUrl,
            });
          } else if (call.name === "requestAppGeneration") {
            stateChanges.push({ 
              type: "REQUEST_APP_GENERATION", 
              appName: call.args.appName, 
              description: call.args.description,
              visibility: call.args.visibility
            });
          }
        }
      }
  
      res.json({
        text: response.text || "好的，我这就为您安排，请稍作等待。",
        stateChanges,
        historyUpdate: { role: "model", parts: response.historyParts || [] },
        provider: response.providerName,
        model: response.model,
      });
    } catch (error) {
      if ((error as any)?.code === "AI_CONFIG_MISSING") return sendMissingAiConfig(res, selectedProviderId);
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });
  
  app.post("/api/generate_app", requireActor, async (req, res) => {
    const { appName, description, modelEngine, providerId, byokProvider } = req.body;
    if (!appName || !description) return res.status(400).json({ error: "Missing args" });
    const selectedProviderId = resolveAiProviderId({ providerId, modelEngine, byokProvider });
  
    try {
      const prompt = `You are an expert frontend developer. 
  The user wants an Alpine.js + Tailwind CSS component.
  App Name: ${appName}
  Description: ${description}
  
  REQUIREMENTS:
  - The 'uiCode' MUST be a beautiful, modern, minimalist HTML widget using Tailwind CSS classes. 
  - CRITICAL: You MUST use Alpine.js (via <div x-data="{...}">) for all state management, interaction logic, and dynamic rendering. Do NOT use vanilla JS <script> tags for logic if Alpine can do it.
  - The Alpine.js library and @alpinejs/persist plugin are pre-loaded in the iframe!
  - Use x-data="{ myVar: $persist('default_value') }" for persistent local storage automatically.
  - You can use Chart.js if data visualization is requested.
  - The generated code will be injected right into the <body> of an iframe. Ensure the root element of your code has a proper Tailwind class like max-h-full, overflow-y-auto, bg-[#0a0a0a], text-white, min-h-[350px], p-4.
  - Make the app fully functional with working data mapping, inputs, array looping (x-for), and state changes.
  - Return ONLY the HTML code. Do NOT wrap it in markdown code blocks (\`\`\`). Just the raw HTML.
  `;
  
      const response = await generateAiContent({
        providerId: selectedProviderId,
        modelEngine,
        contents: prompt,
        temperature: 0.2,
      });
  
      let code = response.text || "";
      code = code.replace(/^```[a-z]*\s*/i, '').replace(/```$/s, '').trim();
  
      res.json({ appName, uiCode: code });
    } catch (error) {
      if ((error as any)?.code === "AI_CONFIG_MISSING") return sendMissingAiConfig(res, selectedProviderId);
      console.error("AI Error generating app:", error);
      res.status(500).json({ error: "Failed to generate app" });
    }
  });
  
  app.post("/api/analyze_file", requireActor, async (req, res) => {
    const { fileName, fileContent, fileImageBase64, mimeType, modelEngine, providerId, byokProvider } = req.body;
    const selectedProviderId = resolveAiProviderId({ providerId, modelEngine, byokProvider });
  
    try {
      let contentsPayload: any;
  
      if (fileImageBase64) {
        const imagePart = {
          inlineData: {
            mimeType: mimeType || "image/png",
            data: fileImageBase64,
          },
        };
        const textPart = {
          text: `The user has uploaded/dragged-in a screenshot of a user interface or application. Your job is to convert this visual layout into a fully-functional, beautiful, and interactive micro-app of the highest quality.
  
  Your task:
  1. Deduce an appropriate, attractive name for this custom micro-app (in Chinese).
  2. Write a brief, user-friendly, and warm description of what this app does (in Chinese).
  3. Build a fully functional, pixel-perfect replication of this design using HTML, Tailwind CSS, and Alpine.js.
     - Leverage Alpine.js for all interactive state management (inputs, calculations, lists, toggle states, graphs, etc.).
     - Make sure to style it beautiful and clean with custom Tailwind classes in high-fidelity dark themes (dark/midnight colors match the workspace's cosmic vibe).
     - Return the result in the requested JSON schema containing appName, description, and uiCode.`,
        };
        contentsPayload = { parts: [imagePart, textPart] };
      } else if (fileContent) {
        contentsPayload = `The user has drag-and-dropped a code/text file named "${fileName}".
  Here is its raw content:
  ---
  ${fileContent}
  ---
  
  The file content can be written in absolutely ANY format or programming language (e.g., React .tsx or .jsx files, Vue SFC, Python scripts with mathematical calculations, JSON/YAML mock datasets, raw system specifications, SQL schemas, markdown docs, or simple TXT designs).
  
  Your task:
  1. Thoroughly parse and logically comprehend the file's goals, user interfaces, calculations, or underlying components.
  2. Formulate an elegant, highly fitting, and professional Chinese name for this micro-app (e.g. 待办效率看板, 智能计算器, 实时分析等).
  3. Formulate a short, friendly, and engaging Chinese description of what this micro-app does, explicitly acknowledging the original source format/language you recognized (e.g., "已从您的 React TSX 模块无缝迁移并重构为原生 AlpineJS...").
  4. Reconstruct and compile a complete, highly polished, self-contained client-side micro-app using HTML, Tailwind CSS, and Alpine.js:
     - Make it ultra-interactive: utilize Alpine.js features (such as x-data, x-init, x-model, x-on, x-for, and Alpine.$persist modifier to persist user input, lists, or toggle selections).
     - Ensure the styling is gorgeous, clean, modern, and perfectly aligned with our cosmos black workstation vibe (use deep sleek dark tones, nice borders like border-white/[0.08], subtle highlights, animations, and typography).
     - If there is mathematical logic, charts, or state modifications (e.g., a line graph in the original python code, or interactive tables in TSX), map them to fully functional, interactive counterparts (e.g., using Chart.js inside the iframe or elegant Tailwind layouts).
     - Return outstanding Chinese-localized code inside the 'uiCode' property.`;
      } else {
        return res.status(400).json({ error: "Missing file content or image base64" });
      }
  
      const response = await generateAiContent({
        providerId: selectedProviderId,
        modelEngine,
        contents: contentsPayload,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            appName: { type: Type.STRING, description: "Elegant master level custom app name in Chinese" },
            description: { type: Type.STRING, description: "Compact description in Chinese explaining what this app does and what the AI recognized" },
            uiCode: { type: Type.STRING, description: "The complete HTML / Alpine.js / Tailwind CSS micro-app code block" }
          },
          required: ["appName", "description", "uiCode"]
        },
        temperature: 0.2,
      });
  
      const resultText = response.text || "{}";
      const resultJson = JSON.parse(resultText);
  
      res.json(resultJson);
    } catch (error) {
      if ((error as any)?.code === "AI_CONFIG_MISSING") return sendMissingAiConfig(res, selectedProviderId);
      console.error("AI Error analyzing file:", error);
      res.status(500).json({ error: "Failed to analyze and recognize file" });
    }
  });
  
  app.post("/api/refine_code", requireActor, async (req, res) => {
    const { currentCode, instruction, modelEngine, providerId, byokProvider } = req.body;
  
    if (!currentCode || !instruction) {
      return res.status(400).json({ error: "Missing currentCode or instruction" });
    }
    const selectedProviderId = resolveAiProviderId({ providerId, modelEngine, byokProvider });
  
    try {
      const prompt = `You are a micro-app refiner. The user wants to modify an existing HTML/Alpine.js/Tailwind CSS micro-app.
  Your absolute goal is to modify the code according to their instruction while keeping all other logic, features, and UI style intact.
  
  Here is the current micro-app code:
  \`\`\`html
  ${currentCode}
  \`\`\`
  
  Here is the user's instruction of what to change/add/fix:
  "${instruction}"
  
  Your task:
  1. Carefully understand the user's intent. They might want styling adjustments (e.g. green background, golden alerts), new interactive features (e.g. a "reset history" button, an additional input field), or layout changes.
  2. Carefully preserve the pre-existing variables, methods, AlpineJS x-data, and stored states ($persist) unless explicitly instructed to remove or replace them.
  3. Make sure to output the ENTIRE modified, fully functional, self-contained micro-app code block. Do NOT omit any sections or write placeholders like "...rest of the code...".
  4. Ensure the output fits the standard dark-themed workspace aesthetic, matching the clean black-slate palette of the application.
  5. Return the result in the requested JSON schema.`;
  
      const response = await generateAiContent({
        providerId: selectedProviderId,
        modelEngine,
        contents: prompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedCode: { type: Type.STRING, description: "The complete revised and polished HTML/Alpine/Tailwind code block after satisfying the user's request" }
          },
          required: ["refinedCode"]
        },
        temperature: 0.2,
      });
  
      const result = JSON.parse(response.text || "{}");
      res.json({ refinedCode: result.refinedCode });
    } catch (error) {
      if ((error as any)?.code === "AI_CONFIG_MISSING") return sendMissingAiConfig(res, selectedProviderId);
      console.error("AI Error refining code:", error);
      res.status(500).json({ error: "微调代码时发生意外错误，请重试" });
    }
  });
}
