// POST /shield/share-target (rewritten here) only happens when Shield's service worker isn't running yet.
// The shared text is never read, stored or logged: we answer straight away and send the person back to Shield.
export function POST() {
  return new Response(null, { status: 303, headers: { location: '/shield/?share=retry', 'cache-control': 'no-store' } });
}
export const GET = POST;
