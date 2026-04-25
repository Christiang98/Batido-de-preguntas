/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fuerza output estático puro — sin SSR, sin pre-render del servidor
  // Ideal para apps Firebase que corren 100% en el cliente
  output: 'export',
}
module.exports = nextConfig
