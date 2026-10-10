import { themes } from './catalog.mjs';

const page = (path, title, description, indexable = true) => ({ path, title, description, indexable });

export const publicPages = Object.freeze([
  page('/en/', 'Printable Story Adventures for Home & Classroom', 'Explore printable story adventures for kids. Choose distinct Home and Classroom games, try a free Celebration pack, or create a custom story.'),
  page('/en/themes/', 'Printable Adventure Themes for Kids', 'Explore illustrated story worlds with separate Home and Classroom missions. Browse ready-made games and ideas for custom printable adventures.'),
  page('/en/for-home/', 'Printable Adventure Games for Kids at Home', 'Explore print-at-home story adventures for ages 6–12. Try the free Celebration game, browse themed Home packs, or create a custom story.'),
  ...themes.flatMap(theme => [
    page(`/en/themes/${theme.id}/`, `${theme.title} Story World`, `Choose the Home or Classroom story in the ${theme.title} world.`, false),
    ...['home', 'classroom'].map(setting => page(
      `/en/themes/${theme.id}/${setting}/`,
      `${theme.story[setting].title} | Printable ${setting === 'home' ? 'Home' : 'Classroom'} Adventure`,
      `${theme.story[setting].goal} Explore the five paper checkpoints, printable materials and adult guide for this ${setting === 'home' ? 'Home' : 'Classroom'} game.`,
    )),
  ]),
  page('/en/for-classroom/', 'Printable Classroom Adventure Games for Kids', 'Printable story adventures for classrooms, ages 6–12. Explore group missions, the free Celebration game, and Player Packs with Teacher Guides in A4 and US Letter.'),
  page('/en/occasions/halloween/', 'Halloween Story Adventures', 'Explore playful Halloween story-world ideas and preview a printable group adventure.'),
  page('/en/how-it-works/', 'How Paper Adventures Work', 'See how a story idea becomes a printable group adventure, from setup to player pages and an organiser guide.'),
  page('/en/create/', 'Custom Printable Adventure Games for Kids', 'Create a printable story adventure for ages 6–12. Choose Home or Classroom, preview two short directions, and see what comes in the Player Pack and adult guide.'),
  page('/en/samples/', 'Free Printable Adventure Samples', 'Explore the free Celebration story games for Home and Classroom, with Player Packs and adult guides in A4 and US Letter.'),
  page('/en/samples/home/', 'Free Printable Home Adventure Game', 'Download the free Celebration Home Player Pack and Host Guide in A4 or US Letter and see how a family story adventure works.'),
  page('/en/samples/classroom/', 'Free Printable Classroom Adventure Game', 'Download the free Celebration Classroom Player Pack and Teacher Guide in A4 or US Letter for a guided group story mission.'),
  page('/en/pricing/', 'Printable Adventure Game Pricing', 'Compare Home and Classroom ready-made packs, custom adventures and the free Celebration game. Paid checkout currently uses Stripe test mode.'),
  page('/en/help/', 'Help with Printable Adventures', 'Find help with printable game packs, free downloads, custom adventures, file access and support.'),
  page('/en/help/start/', 'Getting Started', 'Preview how an adult organiser guides a printable story adventure from invitation to final reveal.'),
  page('/en/help/print/', 'Printing Help', 'Preview printing guidance for player pages and organiser materials.'),
  page('/en/help/recover/', 'Order Recovery', 'Get help recovering a verified adventure order.', false),
  page('/en/help/report/', 'Report a Problem', 'Preview the support path for a missing or defective adventure file.'),
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
