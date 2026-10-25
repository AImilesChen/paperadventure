import { themes } from '../shared/catalog.mjs';
import { useEffect, useState } from 'react';

const workshopImage = '/assets/custom-adventure-workshop-v1.jpg';
const themeArt = [
  [/西游|journey\s+(?:to\s+the\s+)?west|monkey king|sun wukong|东方神话/i, '/assets/custom-journey-west-cover-v1.webp'],
  [/\bclock(?:\s*tower)?\b|钟楼|时钟/i, '/assets/custom-clock-tower-cover-v1.webp'],
  [/\bdinosaurs?\b|恐龙/i, '/assets/dinosaur.png'],
  [/\b(?:space|astronaut|galaxy|planet|cosmic)\b|太空|宇宙|星球/i, '/assets/space.png'],
  [/\b(?:ocean|underwater|sea|marine)\b|海洋|海底|大海/i, '/assets/ocean-classroom-v0.1.webp'],
  [/\b(?:forest|woodland)\b|森林/i, '/assets/forest.png'],
  [/\b(?:museum|curator)\b|博物馆/i, '/assets/museum-classroom-v0.1.webp'],
  [/\b(?:library|librarian)\b|图书馆/i, '/assets/library-classroom-v0.1.webp'],
  [/\b(?:weather|cloud|rain|wind)\b|天气|气象/i, '/assets/weather-classroom-v0.1.webp'],
  [/\b(?:halloween|pumpkin)\b|万圣节|南瓜/i, '/assets/halloween-friendly-v0.1.jpg'],
  [/\b(?:christmas|santa)\b|圣诞/i, '/assets/christmas.png'],
  [/\b(?:birthday|celebration|party)\b|生日|庆典|派对/i, '/assets/celebration.png'],
  [/\b(?:inventor|invention|workshop)\b|发明|工坊/i, '/assets/workshop-classroom-v0.1.webp'],
];

export function adventureCoverImage(order) {
  if (order.product_kind !== 'custom') return order.image;
  // A real stored cover takes precedence. The shared promotion is not a theme.
  if (order.image && order.image !== workshopImage) return order.image;
  const world = themes.find(theme => theme.id === order.themeId);
  if (world) return world.story?.[order.setting]?.image || world.image;
  return themeArt.find(([pattern]) => pattern.test(order.title || ''))?.[1] || null;
}

export default function AdventureCover({ order }) {
  const image = adventureCoverImage(order);
  const [failed,setFailed]=useState(false);
  useEffect(()=>setFailed(false),[image]);
  const fallback=adventureCoverImage({...order,image:undefined});
  const source=failed?fallback:image;
  return source ? <img src={source} onError={()=>setFailed(true)} alt="" width="800" height="450" loading="lazy" /> : <div className="adventure-cover-placeholder" role="img" aria-label="Theme cover unavailable"><span aria-hidden="true">◇</span><span>Theme cover unavailable</span></div>;
}

