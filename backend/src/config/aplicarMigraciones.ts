import { execSync } from 'node:child_process';

export function aplicarMigraciones(): void {
  console.log('Revisando migraciones...');
  execSync('prisma migrate deploy', { stdio: 'inherit' });
}