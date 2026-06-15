import fs from 'fs';

const filePath = 'src/components/apps/StudioApp.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const lines = content.split(/\r?\n/);

console.log("Lines 915 to 932:");
for (let idx = 914; idx <= 932; idx++) {
  console.log(`${idx + 1}: ${lines[idx]}`);
}

// Let's remove lines 921 to 925 from files (0-indexed indices: 920 to 924)
// Let's verify line 921 to 925 contents
if (lines[920].trim() === '</div>' && 
    lines[921].trim() === '</div>' && 
    lines[922].trim() === '</div>' && 
    lines[923].trim() === '</motion.div>' && 
    lines[924].trim() === ')}') {
  console.log("Found duplicate block! Removing...");
  lines.splice(920, 5);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log("Successfully cleaned up.");
} else {
  console.log("Did not match exact duplicate sequence. Let's do selective removal.");
}
