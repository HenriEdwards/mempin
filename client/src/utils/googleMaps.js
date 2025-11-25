import { Loader } from '@googlemaps/js-api-loader';

const DEFAULT_LIBRARIES = ['places', 'geometry'];
let loaderPromise = null;

export function loadGoogleMapsApi(extraLibraries = []) {
  if (loaderPromise) return loaderPromise;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    loaderPromise = Promise.reject(
      new Error('Missing Google Maps API key. Set VITE_GOOGLE_MAPS_API_KEY in your environment.'),
    );
    return loaderPromise;
  }

  const loader = new Loader({
    apiKey,
    version: 'weekly',
    libraries: Array.from(new Set([...DEFAULT_LIBRARIES, ...extraLibraries])),
  });

  loaderPromise = loader
    .load()
    .then((google) => {
      if (!google?.maps) throw new Error('Google Maps SDK failed to load');
      return google;
    })
    .catch((error) => {
      loaderPromise = null;
      throw error;
    });

  return loaderPromise;
}

export default loadGoogleMapsApi;
