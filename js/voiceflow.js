// Quickwell's site-wide Voiceflow overlay. The client key is intended for browser widget use.
(() => {
  if (window.__quickwellVoiceflowLoaded) return;
  window.__quickwellVoiceflowLoaded = true;

  const script = document.createElement('script');
  script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  script.type = 'text/javascript';
  script.onload = () => {
    if (!window.voiceflow?.chat?.load) return;
    window.voiceflow.chat.load({
      verify: { clientKey: 'vfs_JaDtZdpS_3Xtjf8ApCqnJARjKWxzbwUhH' },
      url: 'https://general-runtime.voiceflow.com',
      voice: { url: 'https://runtime-api.voiceflow.com' },
      environmentID: 'main',
      versionVariant: 'published',
      launch: {
        event: {
          type: 'launch',
          payload: {
            activePath: window.location.pathname,
            hostDomain: window.location.hostname
          }
        }
      }
    });
  };
  document.head.appendChild(script);
})();
