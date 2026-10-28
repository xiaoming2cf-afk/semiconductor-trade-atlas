// Public assets share Vite's base path in local and repository Pages builds.
export function assetUrl(path) {
  const relative=String(path).replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${import.meta.env.BASE_URL}${relative}`;
}
