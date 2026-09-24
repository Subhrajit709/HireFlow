/** @type {import('next').NextConfig} */
const nextConfig = {
  // PGlite ships a WASM build of Postgres; keep it out of the bundler.
  serverExternalPackages: ["@electric-sql/pglite"],
};
export default nextConfig;
