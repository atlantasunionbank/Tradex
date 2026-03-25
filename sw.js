// ============================================================
// SW.JS — Atlantas Platform · Service Worker
// Enables PWA installation and basic offline caching
// ============================================================

var CACHE_NAME = 'atlantas-v1';

// Files to cache for offline use
var CACHE_FILES = [
  '/',
  '/index.html',
  '/user.js',
  '/app.js',
  '/config.js',
  '/manifest.json'
];

// Install — cache core files
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k)   { return caches.delete(k);  })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', function(e) {
  // Only handle GET requests
  if (e.request.method !== 'GET') return;

  // Skip Firebase and external API requests — always go to network
  var url = e.request.url;
  if (url.includes('firebaseio.com')   ||
      url.includes('googleapis.com')   ||
      url.includes('emailjs.com')      ||
      url.includes('cloudinary.com')   ||
      url.includes('gstatic.com')      ||
      url.includes('fonts.google')     ||
      url.includes('jsdelivr.net')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        // Cache successful responses
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        // Network failed — try cache
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('/index.html');
        });
      })
  );
});
