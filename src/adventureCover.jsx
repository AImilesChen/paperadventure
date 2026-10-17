import { Compass } from '@phosphor-icons/react';

// Order identity survives plan rewrites and every library tab uses this cover.
export default function AdventureCover({ order }) {
  if (order.product_kind !== 'custom') return order.image ? <img src={order.image} alt="" width="800" height="600" loading="lazy" /> : null;
  const identity = String(order.id || order.title || 'adventure');
  const hash = Array.from(identity).reduce((value, letter) => (Math.imul(value, 31) + letter.codePointAt(0)) >>> 0, 0);
  const title = order.title || 'Your custom adventure';
  return <div className={'adventure-cover' + (Array.from(title).length > 65 ? ' adventure-cover-long' : '')} data-tone={hash % 6} aria-hidden="true">
    <span className="adventure-cover-label">CUSTOM ADVENTURE</span>
    <Compass className="adventure-cover-compass" size={124} weight="thin" />
    <strong className="adventure-cover-title">{title}</strong>
    <span className="adventure-cover-footer"><span>{order.setting === 'classroom' ? 'Classroom' : 'Home'}</span><span>Order {identity.slice(0,8).toUpperCase()}</span></span>
  </div>;
}
