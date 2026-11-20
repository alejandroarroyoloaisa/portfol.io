import { execSync } from 'child_process';
import { rmSync } from 'fs';
import { join } from 'path';

export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? 'postgresql://portfolio:portfolio@localhost:5434/portfolio_test?schema=public';
  const bin = join(__dirname, '..', '..', '..', 'node_modules', '.bin', 'prisma');
  execSync(`"${bin}" migrate deploy`, { cwd: join(__dirname, '..'), env: { ...process.env, DATABASE_URL: url }, stdio: 'ignore' });
  return () => rmSync(join(__dirname, '..', 'uploads-test'), { recursive: true, force: true });
}
