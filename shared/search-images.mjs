import images from './search-images.json' with {type:'json'};
import {basePath} from './locale.mjs';
import {themes} from './catalog.mjs';
import {guideFor} from './guides.mjs';

// Only existing public illustrations and approved excerpts observed in indexable
// pages are eligible. Unknown files, private downloads and errors stay noindex.
export function isPublicSearchImage(pathname, response) {
  return Object.hasOwn(images,pathname) && response.status===200 &&
    /^(?:image\/(?:jpeg|png|webp))(?:;|$)/i.test(response.headers.get('content-type')||'');
}

export function pageSearchImage(page,origin='https://paperadventure.app') {
  const path=basePath(page.path);
  const fixed={
    '/en/':'/assets/hero-workshop.png',
    '/en/for-home/':'/assets/celebration-home-v0.1.jpg',
    '/en/for-classroom/':'/assets/celebration-classroom-v0.1.jpg',
    '/en/themes/':'/assets/hero-workshop.png',
    '/en/samples/home/':'/assets/celebration-home-v0.1.jpg',
    '/en/samples/classroom/':'/assets/celebration-classroom-v0.1.jpg',
    '/en/occasions/halloween/':'/assets/halloween.png',
    '/en/occasions/christmas/':'/assets/christmas.png',
    '/en/occasions/birthday/':'/assets/celebration-home-v0.1.jpg',
  };
  const match=path.match(/^\/en\/themes\/([^/]+)\/(home|classroom)\/$/);
  const theme=match&&themes.find(t=>t.id===match[1]);
  const source=page.indexable&&(fixed[path]||guideFor(path)?.image||(theme&&(theme.story[match[2]]?.image||theme.image)));
  const preferred=Boolean(source&&Object.hasOwn(images,source));
  const asset=preferred?source:'/og-image.jpg';
  return {url:origin+asset,...images[asset],preferred};
}
