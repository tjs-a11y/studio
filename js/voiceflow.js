// Quickwell's site-wide Voiceflow widget using the snippet generated in Voiceflow Installation.
(() => {
  if (window.__quickwellVoiceflowLoaded) return;
  window.__quickwellVoiceflowLoaded = true;

  const script = document.createElement('script');
  const firstScript = document.getElementsByTagName('script')[0];

  script.onload = () => {
    if (!window.voiceflow?.chat?.load) return;
    window.voiceflow.chat.load({
      verify: { projectID: '6aeb6d29111a651418c31071' },
      url: 'https://general-runtime.voiceflow.com',
      voice: {
        url: 'https://runtime-api.voiceflow.com'
      }
    });
  };

  script.src = 'https://cdn.voiceflow.com/widget-next/bundle.mjs';
  script.type = 'text/javascript';
  firstScript.parentNode.insertBefore(script, firstScript);
})();
