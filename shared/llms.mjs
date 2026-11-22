import {siteIdentity} from './site-identity.mjs';
import {catalogSummary} from './sudoku/catalog.mjs';
import {pointsProducts,pointsMoney} from './credits/products.mjs';
import {helpPrices} from './sudoku/help-model.mjs';
import {freePuzzles} from './free-puzzles.mjs';
const base='https://paperadventure.app';
export function renderLlms({origin=base,catalog=catalogSummary,products=pointsProducts,prices=helpPrices,puzzles=freePuzzles}={}){
 const link=(title,path,note)=>`- [${title}](${origin}${path}): ${note}`;
 return `# ${siteIdentity.name}

> Printable story adventures for families and classrooms in English and Simplified Chinese, free online escape puzzles, and progressive Sudoku with optional paid help.

Printable adventure packs are designed for children ages 6–12 and adult hosts or teachers. Online puzzles and Sudoku are separate activities with their own rules. Public pages below explain each product; purchase availability and current terms are shown on the pricing and purchase pages.

The six Home and six Classroom ready-made theme games offer English and Simplified Chinese editions, including the two free Celebration games. Other printable escape adventures and their puzzle PDFs currently use English. AI-generated custom stories and PDFs currently use English; a Chinese interface does not change their content language.

## Start here

${link('Paper Adventure','/en/','Overview of the games and free starting points.')}
${link('Themes','/en/themes/','Compare Home and Classroom story collections.')}
${link('Pricing','/en/pricing/','Printable game options and one-time AI credit packs.')}
${link('简体中文首页','/zh/','中文网站入口；查看游戏玩法、准备要求和资料语言。')}
${link('中文家庭冒险','/zh/for-home/','六款家庭主题游戏；庆典游戏可完整免费体验。')}
${link('中文课堂冒险','/zh/for-classroom/','六款教师带领的课堂主题游戏。')}
${link('免费中文家庭游戏','/zh/samples/home/','失踪的生日宝箱；玩家材料与成人主持指南。')}
${link('免费中文课堂游戏','/zh/samples/classroom/','冒险俱乐部的第一枚徽章；玩家材料与教师指南。')}

## Printable adventures

${link('For home','/en/for-home/','Family story adventures with printable player materials and an adult Host Guide.')}
${link('For classrooms','/en/for-classroom/','Teacher-led group adventures with Player Packs and Teacher Guides.')}
${link('Free home game','/en/samples/home/','The Missing Birthday Chest; complete free Player Pack and Host Guide.')}
${link('Free classroom game','/en/samples/classroom/','The Adventure Club’s First Badge; complete free classroom trial.')}
${link('Printable escape adventures','/en/escape-room-games/','Compare complete printable escape stories, preparation requirements and editions.')}
${link('AI custom adventures','/en/create/','Configure a custom printable story; an adult account is used for saved work and purchases.')}
${link('Preparation guides','/en/guides/','Practical hosting and preparation guidance. Printable packs offer A4 and US Letter formats.')}

## Online escape puzzles

${link('Online puzzle collection','/en/escape-room-puzzles/',`${puzzles.length} free-to-play puzzles with different code, logic and route tasks. The first hint is free; deeper help and answers use shared AI credits, with costs shown before unlocking.`)}
${puzzles.map(p=>link(p.title,`/en/escape-room-puzzles/#${p.id}`,p.level+'. Read the rules and success conditions on this game.')).join('\n')}

## Sudoku

${link('Play Sudoku','/en/sudoku/',`Progressive adventure with ${catalog.publishedCount} published, unique-solution puzzles. Clear earlier levels to unlock the next; progress can be linked to an adult account.`)}
${link('Level collections','/en/sudoku/levels/','Inspect chapters and solving-technique stages; later level numbers do not guarantee a longer solve.')}
${link('How to play','/en/sudoku/how-to-play/','Rules, controls, candidate notes and an illustrated first deduction.')}
${link('Solving techniques','/en/sudoku/techniques/','Free lessons and independent exercises for singles, hidden singles, locked candidates and naked pairs.')}
${link('Leaderboard','/en/sudoku/leaderboard/','Compare levels cleared or verified best times on the same puzzle. Public listing is optional; using hints is allowed.')}

A Sudoku thinking hint costs ${prices.reasoning} AI credit. A next-cell answer costs ${prices.answer} credits in total for the same board position; upgrading from a thinking hint costs ${prices.answer-prices.reasoning} more. Already unlocked help is free to read again. A changed numeric board can require a new unlock; pencil notes do not reset a purchase. Help does not automatically fill the board or guarantee completion.

## AI credits

${link('Shared AI credits','/en/credits/',products.map(p=>`${p.points} credits for ${pointsMoney(p.unitAmount)} USD`).join('; ')+'. One-time purchases, no subscription or automatic renewal.')}

One account balance works across Sudoku and supported online escape puzzles. Costs are displayed before unlocking help. Free play, free lessons and credit purchases have different purposes; buying credits does not buy a printable adventure pack.

## Publisher, help and policies

${link('About Paper Adventure','/en/about/','Publisher identity, game formats and content-checking approach.')}
${link('Contact','/en/contact/','Support email and order-linked help.')}
${link('Help','/en/help/','Assistance with games, purchases and downloads.')}
${link('Printing help','/en/help/print/','ZIP files, paper sizes and print preparation.')}
${link('Report a problem','/en/help/report/','How to contact support about missing or faulty files and purchases.')}
${link('Refund information','/en/refunds/','Current cancellation and refund conditions; support reviews refund requests.')}
${link('Terms','/en/terms/','Terms of use and sale.')}
${link('Privacy','/en/privacy/','Information handling and account privacy.')}
${link('Cookies and storage','/en/cookies/','Cookies, browser storage and related choices.')}
`;
}
