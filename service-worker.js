// Service Worker for PWA
const CACHE_NAME = 'file-converter-v1';

// 현재 위치 기준으로 캐시할 파일들
const getCacheUrls = () => {
  // service-worker.js의 위치를 기준으로 상대 경로 생성
  const basePath = self.location.pathname.substring(0, self.location.pathname.lastIndexOf('/') + 1);
  const baseUrl = self.location.origin + basePath;
  
  return [
    baseUrl + 'index.html',
    baseUrl + 'icon-192x192.png',
    baseUrl + 'icon-512x512.png'
  ];
};

// 설치 이벤트 - 캐시 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 열기');
        const urlsToCache = getCacheUrls();
        return cache.addAll(urlsToCache).catch((error) => {
          console.log('일부 파일 캐시 실패:', error);
          // 일부 파일이 실패해도 계속 진행
        });
      })
  );
  // 즉시 활성화
  self.skipWaiting();
});

// 활성화 이벤트 - 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('오래된 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // 즉시 클라이언트 제어
  return self.clients.claim();
});

// fetch 이벤트 - 네트워크 우선, 실패 시 캐시 사용
self.addEventListener('fetch', (event) => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 유효한 응답인지 확인
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 응답 복제
        const responseToCache = response.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // 네트워크 실패 시 캐시에서 반환
        return caches.match(event.request).then((cachedResponse) => {
          // 캐시에도 없으면 index.html 반환 (SPA 라우팅 지원)
          if (!cachedResponse && event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });
      })
  );
});

