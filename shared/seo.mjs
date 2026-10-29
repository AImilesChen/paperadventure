import { themes } from './catalog.mjs';
import { guides, guideFor } from './guides.mjs';
import { siteIdentity } from './site-identity.mjs';

export function pageSchema(page, release, origin = 'https://paperadventure.app') {
  const url = origin + page.path;
  const publisher = { '@type': 'Organization', '@id': origin + '/#publisher', ...siteIdentity, url: origin + '/en/', logo: origin + '/icon-512.png' };
  const graph = [{ '@type': 'WebPage', '@id': url + '#page', name: page.title, description: page.description, url, isPartOf: { '@id': origin + '/#website' } }, { '@type': 'WebSite', '@id': origin + '/#website', ...siteIdentity, url: origin + '/en/', publisher: { '@id': publisher['@id'] } }, publisher];
  if (!page.indexable) return { '@context': 'https://schema.org', '@graph': graph };
  const crumbs = [{ name: 'Home', url: origin + '/en/' }];
  const guide = guideFor(page.path);
  if (page.path === '/en/guides/') {
    graph[0]['@type'] = 'CollectionPage';
    graph[0].mainEntity = { '@id': url + '#guides' };
    graph.push({ '@type': 'ItemList', '@id': url + '#guides', name: 'Printable adventure game guides', numberOfItems: guides.length, itemListElement: guides.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.title, url: origin + item.path })) });
  }
  if (page.path === '/en/occasions/birthday/') {
    graph[0]['@type'] = 'CollectionPage';
    graph[0].mainEntity = { '@id': url + '#games' };
    graph.push({ '@type': 'ItemList', '@id': url + '#games', name: 'Home adventure games for birthday gatherings', numberOfItems: 3, itemListElement: ['celebration', 'dinosaur', 'space'].map((id, index) => ({ '@type': 'ListItem', position: index + 1, name: themes.find(item => item.id === id).story.home.title, url: origin + (id === 'celebration' ? '/en/samples/home/' : `/en/themes/${id}/home/`) })) });
    crumbs.push({ name: 'Home adventures', url: origin + '/en/for-home/' });
  }
  if (page.path.startsWith('/en/guides/') && guide) crumbs.push({ name: 'Guides', url: origin + '/en/guides/' });
  const match = page.path.match(/^\/en\/themes\/([^/]+)\/(home|classroom)\/$/);
  if (match) {
    const [, id, setting] = match;
    const theme = themes.find(item => item.id === id);
    const live = release?.catalog?.themes.find(item => item.id === id);
    if (theme?.availableSettings.includes(setting)) {
      const story = theme.story[setting];
      const offer = release?.catalog?.offers.find(item => item.sku === 'ready_' + setting);
      const free = release?.catalog?.freeSampleThemeId === id && live?.[setting].freeSample;
      const sale = live?.[setting].readyStatus === 'published' && release?.runtime.checkout && release.runtime.checkoutMode === 'live' && offer?.saleEnabled;
      graph.push({ '@type': 'Product', '@id': url + '#product', name: story.title + (setting === 'home' ? ' · Home' : ' · Classroom'), description: story.goal, image: origin + (story.image || theme.image), url, sku: story.code, brand: { '@type': 'Brand', name: publisher.name }, ...(free || sale ? { offers: { '@type': 'Offer', url, price: free ? '0.00' : (offer.unitAmount / 100).toFixed(2), priceCurrency: 'USD', availability: 'https://schema.org/InStock', seller: { '@id': publisher['@id'] } } } : {}) });
      crumbs.push({ name: setting === 'home' ? 'Home adventures' : 'Classroom adventures', url: origin + (setting === 'home' ? '/en/for-home/' : '/en/for-classroom/') });
    }
  }
  if (guide) graph.push({ '@type': 'Article', '@id': url + '#article', headline: guide.title, description: guide.description, image: [origin + guide.image], datePublished: guide.date, dateModified: guide.date, author: { '@id': publisher['@id'] }, publisher: { '@id': publisher['@id'] }, mainEntityOfPage: { '@id': url + '#page' }, inLanguage: 'en' });
  if (page.path !== '/en/') {
    crumbs.push({ name: page.title, url });
    graph.push({ '@type': 'BreadcrumbList', itemListElement: crumbs.map((item, i) => ({ '@type': 'ListItem', position: i + 1, name: item.name, item: item.url })) });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
