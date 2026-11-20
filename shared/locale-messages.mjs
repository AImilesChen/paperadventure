// Server/build dictionary. Vite substitutes an empty store in the browser;
// main.jsx loads the selected language before importing the application.
import zh from '../src/i18n/zh.json' with {type:'json'};
import overrides from '../src/i18n/zh-overrides.json' with {type:'json'};
export const dictionaries={zh:{...zh,...overrides}};
