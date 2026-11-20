export const feedbackTypes={suggestion:'Suggestion',bug:'Bug',other:'Other'};
export const feedbackBrowsers=['Chrome','Edge','Firefox','Safari','Other'];
export const feedbackDevices=['desktop','mobile','tablet'];

// Keep useful public page context; discard queries, fragments and private order IDs.
export function feedbackPagePath(value) {
  if(typeof value!=='string'||value.length>2000||!value.startsWith('/')||value.startsWith('//'))return '/';
  const path=value.split(/[?#]/)[0];
  if(!/^\/(?:(?:en|zh)(?:\/|$))?[-a-zA-Z0-9_/]*$/.test(path))return '/';
  if(/^\/(?:en|zh)\/orders(?:\/|$)/.test(path))return `/${path.split('/')[1]}/orders/`;
  if(/^\/(?:en|zh)\/(account|checkout|my-adventures|create)(?:\/|$)/.test(path))return `/${path.split('/')[1]}/${path.split('/')[2]}/`;
  if(!/^\/(?:en|zh)\//.test(path))return '/';
  return path.slice(0,300);
}

export function feedbackPayloadSignature(value) {
  return JSON.stringify([value.type,value.message,value.wantsReply,value.email||null,value.pagePath,value.browserCategory,value.deviceCategory]);
}
