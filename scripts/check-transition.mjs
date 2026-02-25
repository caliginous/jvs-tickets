import { readFileSync } from "fs";
import { globby } from "globby";

const files = await globby(["src/**/*.{ts,tsx}"]);
let fail = false;

for (const f of files) {
    const s = readFileSync(f, "utf8");
    const lines = s.split("\n");
    
    lines.forEach((ln, i) => {
        if (ln.includes("<Transition") 
            && !ln.includes("<Transition.Root") 
            && !ln.includes("<Transition.Child") 
            && !ln.includes("show=")) {
            console.log(`${f}:${i+1}: <Transition ...> missing show=`);
            fail = true;
        }
    });
}

if (fail) {
    console.error("❌ Found Transition components missing show prop!");
    process.exit(1);
} else {
    console.log("✅ All Transition components have show prop");
}
