import { themes } from './catalog.mjs';

const page = (path, title, description, indexable = true) => ({ path, title, description, indexable });

export const publicPages = Object.freeze([
  page('/en/', 'Printable Adventure Games for Kids | Home & Classroom', 'Explore printable adventure games for ages 6–12. Choose a Home or Classroom story, see the Player Pack and adult guide, try Celebration free, or create your own.'),
  page('/en/themes/', 'Home and Classroom Printable Adventure Worlds', 'Compare six Home adventures with six Classroom adventures. Celebration is the shared free world; the five other story worlds in each collection are different.'),
  page('/en/for-home/', 'Printable Adventure Games for Kids at Home', 'Explore print-at-home story adventures for ages 6–12. Try the free Celebration game, browse themed Home packs, or create a custom story.'),
  ...themes.flatMap(theme => [
    page(`/en/themes/${theme.id}/`, `${theme.title} Story World`, `Explore the ${theme.title} printable story world.`, false),
    ...Object.keys(theme.story).map(setting => page(
      `/en/themes/${theme.id}/${setting}/`,
      `${theme.availableSettings.includes(setting) ? '' : 'Archived | '}${theme.story[setting].title} | Printable ${setting === 'home' ? 'Home' : 'Classroom'} Adventure`,
      `${theme.story[setting].goal} Explore the five paper checkpoints, printable materials and adult guide for this ${setting === 'home' ? 'Home' : 'Classroom'} game.`,
      theme.availableSettings.includes(setting),
    )),
  ]),
  page('/en/for-classroom/', 'Printable Classroom Adventure Games for Kids', 'Printable story adventures for classrooms, ages 6–12. Explore group missions, the free Celebration game, and Player Packs with Teacher Guides in A4 and US Letter.'),
  page('/en/occasions/halloween/', 'Halloween Story Adventures', 'Explore playful Halloween story-world ideas and preview a printable group adventure.'),
  page('/en/how-it-works/', 'How Printable Story Adventure Games Work', 'Learn how to choose a ready-made or custom printable adventure, prepare the Player Pack and adult guide, and play at home or in a classroom.'),
  page('/en/create/', 'Custom Printable Adventure Games for Kids', 'Create a printable story adventure for ages 6–12. Choose Home or Classroom, inspect the free format, then review a personal plan after payment before PDFs are made.'),
  page('/en/samples/', 'Free Printable Adventure Samples', 'Explore the free Celebration story games for Home and Classroom, with Player Packs and adult guides in A4 and US Letter.'),
  page('/en/samples/home/', 'Free Printable Home Adventure Game', 'Download the free Celebration Home Player Pack and Host Guide in A4 or US Letter and see how a family story adventure works.'),
  page('/en/samples/classroom/', 'Free Printable Classroom Adventure Game', 'Download the free Celebration Classroom Player Pack and Teacher Guide in A4 or US Letter for a guided group story mission.'),
  page('/en/pricing/', 'Printable Adventure Pricing for Home & Classroom', 'Compare the free Celebration trial, ready-made theme packs and AI custom adventures. See one-time Home and Classroom prices, included files and download rights.'),
  page('/en/help/', 'Help with Printable Adventures', 'Find your orders and downloads, solve printing problems, get help with stopped custom games, or request a refund.'),
  page('/en/help/start/', 'Getting Started', 'Prepare the Player Pack and adult guide, set up the opening materials, use hints and guide the group through the ending.'),
  page('/en/help/print/', 'Printing Help', 'Extract your ZIP, choose A4 or US Letter, check actual-size printing and prepare player pages separately from the answers.'),
  page('/en/help/recover/', 'Order Recovery', 'Sign in with your purchasing email, find paid orders and download the Player Pack and adult guide.', false),
  page('/en/help/report/', 'Report a Problem', 'Open your paid order to report missing or faulty files, review a stopped game, or submit a refund request.'),
  page('/en/my-adventures/', 'My Adventures', 'Access saved adventure ideas and verified orders in your adult account.', false),
  page('/en/checkout/', 'Adventure Checkout', 'Review your selected adventure before continuing through the current Stripe test checkout.', false),
  page('/en/checkout/demo/', 'Checkout Preview', 'Review an adventure order without placing a payment.', false),
  page('/en/orders/', 'Adventure Order', 'View the status and files for a verified adventure order.', false),
  page('/en/orders/demo/', 'Adventure Order Preview', 'Preview the order and file delivery flow.', false),
  page('/en/account/', 'Sign in to Paper Adventure', 'Sign in with Google to access your adult adventure account.', false),
  page('/en/privacy/', 'Privacy Notice', 'How Paper Adventure handles information for free downloads and adult Google sign-in.'),
  page('/en/terms/', 'Terms of Use and Sale Review', 'Review the current terms topics for Paper Adventure.', false),
  page('/en/cookies/', 'Cookies and Similar Technologies Review', 'Review the current cookie and storage information for Paper Adventure.', false),
  page('/en/refunds/', 'Refund and Cancellation Review', 'Review the current refund and cancellation information for Paper Adventure.', false),
]);

export const pageFor = pathname => publicPages.find(page => page.path === pathname) ?? null;

