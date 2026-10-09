import { themes } from './catalog.mjs';

const page = (path, title, description) => ({ path, title, description });

export const publicPages = Object.freeze([
  page('/en/', 'Printable Story Adventures for Home & Classroom', 'Explore story worlds for home and classroom. Preview ready-made printable games and custom adventures built around your own idea.'),
  page('/en/themes/', 'Story Worlds', 'Browse six story worlds and explore the planned Home, Classroom, and custom adventure options.'),
  ...themes.map(theme => page(`/en/themes/${theme.id}/`, `${theme.title} Story World`, `Explore the ${theme.title} story world and preview ways to play at home or in a classroom. Finished packs are still in preparation.`)),
  page('/en/for-classroom/', 'Classroom Adventures', 'Explore story adventure ideas for classroom groups and preview the teacher-led setup.'),
  page('/en/occasions/halloween/', 'Halloween Story Adventures', 'Explore playful Halloween story-world ideas and preview a printable group adventure.'),
  page('/en/how-it-works/', 'How Paper Adventures Work', 'See how a story idea becomes a printable group adventure, from setup to player pages and an organiser guide.'),
  page('/en/create/', 'Create an Adventure', 'Preview a custom story adventure setup for your players, space, and story idea. Generation and checkout are not live yet.'),
  page('/en/samples/', 'Adventure Samples', 'Preview the structure of a printable story adventure. Finished sample files are being prepared.'),
  page('/en/samples/home/', 'Home Adventure Sample', 'Preview the planned player pages and host guide for a home adventure. The sample PDF is not yet published.'),
  page('/en/samples/classroom/', 'Classroom Adventure Sample', 'Preview the planned player pages and teacher guide for a classroom adventure. The sample PDF is not yet published.'),
  page('/en/pricing/', 'Planned Prices and Rights', 'Compare planned one-time prices for ready-made packs and custom adventures. Checkout is closed while the products and policies are reviewed.'),
  page('/en/help/', 'Help', 'Find answers about planned printable packs, custom adventures, file access, and support.'),
  page('/en/help/start/', 'Getting Started', 'Preview how an adult organiser guides a printable story adventure from invitation to final reveal.'),
  page('/en/help/print/', 'Printing Help', 'Preview printing guidance for player pages and organiser materials.'),
  page('/en/help/recover/', 'Order Recovery', 'See how verified order recovery will work when purchases become available.'),
  page('/en/help/report/', 'Report a Problem', 'Preview the support path for a missing or defective adventure file.'),
  page('/en/my-adventures/', 'My Adventures', 'Preview the future shelf for saved ideas and verified adventure purchases.'),
  page('/en/checkout/', 'Checkout Preview', 'Review the planned purchase flow. Payments are not enabled in this preview.'),
  page('/en/checkout/demo/', 'Checkout Preview', 'Review the planned purchase flow. Payments are not enabled in this preview.'),
  page('/en/orders/', 'Order Preview', 'Preview how an adventure order will move from payment confirmation to file delivery.'),
  page('/en/orders/demo/', 'Order Preview', 'Preview how an adventure order will move from payment confirmation to file delivery.'),
  page('/en/account/', 'Sign in to Paper Adventure', 'Sign in with Google to access your adult adventure account.'),
  page('/en/privacy/', 'Privacy Notice', 'How Paper Adventure handles information for free downloads and adult Google sign-in.'),
  page('/en/terms/', 'Terms of Use and Sale Review', 'Review the draft terms topics. Final sale terms will be published before checkout opens.'),
  page('/en/cookies/', 'Cookies and Similar Technologies Review', 'Review the draft tracking and storage topics. Final choices will match the deployed services.'),
  page('/en/refunds/', 'Refund and Cancellation Review', 'Review the draft refund topics. Final terms will be published before checkout opens.'),
]);

export const pageFor = pathname => publicPages.find(page => page.path === pathname) ?? null;
