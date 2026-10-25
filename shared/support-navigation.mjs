// Preserve a known help task through sign-in; never accept a redirect from this query.
export function libraryIntent(search = '') {
  const params = new URLSearchParams(search);
  const support = ['problem', 'refund'].includes(params.get('support')) ? params.get('support') : '';
  const view = support ? 'orders' : ['games', 'orders'].includes(params.get('view')) ? params.get('view') : '';
  return { support, view };
}
export function libraryPath({ support = '', view = '' } = {}) {
  const intent = libraryIntent(new URLSearchParams({ support, view }).toString());
  return '/en/my-adventures/' + (intent.support ? '?support=' + intent.support : intent.view ? '?view=' + intent.view : '');
}
export function orderSupportPath(orderId, support) {
  const mode = support === 'refund' ? 'refund' : 'problem';
  return '/en/orders/' + encodeURIComponent(orderId) + '/?support=' + mode + '#order-help';
}
