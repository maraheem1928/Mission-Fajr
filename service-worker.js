const CACHE_NAME = "mission-fajr-v1";

self.addEventListener("install", event => {

    self.skipWaiting();

});


self.addEventListener("activate", event => {

    event.waitUntil(
        self.clients.claim()
    );

});


self.addEventListener("fetch", event => {

    const request = event.request;

    // Only handle normal GET requests
    if (request.method !== "GET") {
        return;
    }

    // Do not cache external requests such as Supabase
    if (
        new URL(request.url).origin !==
        self.location.origin
    ) {
        return;
    }

    event.respondWith(

        fetch(request)
            .then(response => {

                if (response.ok) {

                    const responseClone =
                        response.clone();

                    caches.open(CACHE_NAME)
                        .then(cache => {

                            cache.put(
                                request,
                                responseClone
                            );

                        });

                }

                return response;

            })
            .catch(() => {

                return caches.match(request);

            })

    );

});
