// Visit ping + contact submission to the notification Worker (see /worker).
// Set this to your deployed Worker URL, e.g. https://portfolio-notify.<you>.workers.dev
window.NOTIFY_API = 'https://portfolio-notify.rathodvipul99.workers.dev';

(function () {
    const api = window.NOTIFY_API;
    if (api.includes('YOUR-SUBDOMAIN')) return;

    // Visiting once with ?me=1 marks this browser as yours so you aren't notified about yourself
    try {
        if (location.search.includes('me=1')) localStorage.setItem('owner', '1');
        if (localStorage.getItem('owner') || sessionStorage.getItem('visit-sent')) return;
        sessionStorage.setItem('visit-sent', '1');
    } catch (e) { /* storage blocked: still send */ }

    fetch(api + '/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ua: navigator.userAgent,
            screen: screen.width + 'x' + screen.height,
            lang: navigator.language,
            referrer: document.referrer,
            page: location.pathname,
        }),
        keepalive: true,
    }).catch(() => {});
})();
