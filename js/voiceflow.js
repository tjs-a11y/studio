// Quickwell's site-wide Voiceflow overlay, using the published project installation snippet.
(() => {
  if (window.__quickwellVoiceflowLoaded) return;
  window.__quickwellVoiceflowLoaded = true;

  const script = document.createElement('script');
  const firstScript = document.getElementsByTagName('script')[0];
  script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  script.type = 'text/javascript';
  script.onload = () => {
    if (!window.voiceflow?.chat?.load) return;
    window.voiceflow.chat.load({
      verify: { projectID: '6aeb6d29111a651418c31071' },
      url: 'https://general-runtime.voiceflow.com',
      voice: { url: 'https://runtime-api.voiceflow.com' }
    });
  };

  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
})();
