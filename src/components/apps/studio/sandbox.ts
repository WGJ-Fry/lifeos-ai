export const STUDIO_IFRAME_SANDBOX = "allow-scripts allow-forms";

export function buildStudioSandboxSrcDoc(code: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/persist@3.x.x/dist/cdn.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <script>
          (function() {
            const originalLog = console.log;
            const originalError = console.error;
            console.log = function(...args) {
              originalLog.apply(console, args);
              window.parent.postMessage({
                source: 'jarvis-sandbox-frame-log',
                type: 'log',
                message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
              }, '*');
            };
            console.error = function(...args) {
              originalError.apply(console, args);
              window.parent.postMessage({
                source: 'jarvis-sandbox-frame-log',
                type: 'error',
                message: args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
              }, '*');
            };
            window.onerror = function(message, source, lineno) {
              window.parent.postMessage({
                source: 'jarvis-sandbox-frame-log',
                type: 'error',
                message: String(message) + ' (Line: ' + lineno + ')'
              }, '*');
            };
          })();
        </script>
        <style>
          ::-webkit-scrollbar { display: none; }
          body { margin: 0; padding: 0; background: #0a0a0a; color: white; overflow-x: hidden; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
        </style>
      </head>
      <body>
        ${code}
      </body>
    </html>
  `;
}
