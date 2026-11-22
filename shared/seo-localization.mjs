import {translate} from './locale-text.mjs';
import {basePath} from './locale.mjs';

export const seoMessageKey=(path,field)=>`seo:${basePath(path)}:${field}`;
export const productMessageKey=(sku,field)=>`product:${sku}:${field}`;
export function localizedPageMetadata(record,locale) {
  if(locale==='en')return {title:record.title,description:record.description,seoTranslationComplete:true};
  const title=translate(seoMessageKey(record.path,'title'),locale);
  const description=translate(seoMessageKey(record.path,'description'),locale);
  const complete=Boolean(title.trim()&&description.trim()&&title!==seoMessageKey(record.path,'title')&&description!==seoMessageKey(record.path,'description'));
  return {title:complete?title:translate(record.title,locale),description:complete?description:translate(record.description,locale),seoTranslationComplete:complete};
}
export function localizedProduct(product,locale) {
  if(locale==='en')return product;
  const name=translate(productMessageKey(product.sku,'name'),locale);
  const description=translate(productMessageKey(product.sku,'description'),locale);
  return {...product,name:name===productMessageKey(product.sku,'name')?product.name:name,description:description===productMessageKey(product.sku,'description')?product.description:description};
}
