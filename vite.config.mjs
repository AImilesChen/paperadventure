import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const dictionary=()=>JSON.stringify({...JSON.parse(readFileSync(new URL('./src/i18n/zh.json',import.meta.url),'utf8')),...JSON.parse(readFileSync(new URL('./src/i18n/zh-overrides.json',import.meta.url),'utf8'))});
function localeAssets(){return {
  name:'selected-language-dictionary',
  enforce:'pre',
  resolveId(source,importer,options){if(source==='./locale-messages.mjs'&&importer?.replaceAll('\\','/').endsWith('/shared/locale-text.mjs')&&!options.ssr)return '\0browser-locale-messages';},
  load(id){if(id==='\0browser-locale-messages')return 'export const dictionaries={};';},
  config(){return {define:{__LOCALE_REVISION__:JSON.stringify(createHash('sha256').update(dictionary()).digest('hex').slice(0,12))}};},
  configureServer(server){server.middlewares.use('/locales/zh.json',(req,res)=>{res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-cache');res.end(dictionary());});},
  generateBundle(){this.emitFile({type:'asset',fileName:'locales/zh.json',source:dictionary()});}
};}

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    proxy: {"/api/": process.env.SUDOKU_API_ORIGIN || "http://127.0.0.1:5616", ...(process.env.SUDOKU_POINTS_TEST === "true" ? {"/__points-test/":process.env.SUDOKU_API_ORIGIN || "http://127.0.0.1:5652"}: {})},
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [localeAssets(),react()],
});
