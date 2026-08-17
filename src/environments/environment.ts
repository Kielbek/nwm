/**
 * apiUrl is relative on purpose: in dev, proxy.conf.json forwards /api,
 * /oauth2, and /login to the Spring backend; in production the typical
 * deployment puts a reverse proxy in front of both apps on the same origin.
 * Set this to an absolute backend URL only if the frontend and backend are
 * deployed on genuinely different origins — the backend's CORS config
 * already allows credentials for that case.
 */
export const environment = {
  production: false,
  apiUrl: '',
};
