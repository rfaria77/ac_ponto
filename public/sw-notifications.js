// Ponto A&C - Service Worker Push & Notification Handler
// Gerencia alertas de ponto eletrônico para início e fim de expediente

self.addEventListener('push', (event) => {
  let data = {
    title: 'Ponto A&C — Lembrete de Ponto',
    body: 'Está na hora de registrar o seu ponto eletrônico.',
    tag: 'ponto-turno-lembrete',
    url: '/?aba=baterPonto',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png'
  };

  if (event.data) {
    try {
      const json = event.data.json();
      data = Object.assign({}, data, json);
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag || 'ponto-turno-lembrete',
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/?aba=baterPonto',
      tipo: data.tipo || 'lembrete',
      timestamp: Date.now()
    },
    actions: [
      {
        action: 'bater_ponto',
        title: '⏱️ Bater Ponto Agora'
      },
      {
        action: 'fechar',
        title: 'Dispensar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'fechar') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/?aba=baterPonto';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            action: event.action,
            data: event.notification.data
          });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data, actions } = event.data;
    const options = {
      body: body || 'Horário de registro de ponto!',
      icon: icon || '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: tag || 'ponto-turno-lembrete',
      renotify: true,
      vibrate: [200, 100, 200, 100, 200],
      requireInteraction: true,
      data: data || { url: '/?aba=baterPonto' },
      actions: actions || [
        { action: 'bater_ponto', title: '⏱️ Bater Ponto Agora' },
        { action: 'fechar', title: 'Dispensar' }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(title || 'Ponto A&C — Lembrete de Horário', options)
    );
  }
});
