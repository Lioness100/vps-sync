/* eslint-disable n/no-sync */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import path from 'node:path';

const execAsync = promisify(exec);

export async function runDeploy(appName: string) {
	console.log(`[Deploy] Triggering deployment for ${appName}…`);

	try {
		const cwd = path.resolve(process.cwd(), `../${appName}`);

		if (!existsSync(cwd)) {
			throw new Error(`Local path '${cwd}' does not exist.`);
		}

		const env = { ...process.env };
		delete env.GITHUB_SECRET;
		delete env.PORT;

		await execAsync(`git pull origin main && bun pm2`, { cwd, env });
		console.log(`[Deploy] ✅ Successfully deployed ${appName}.\n`);
	} catch (error: any) {
		console.error(`[Deploy] ❌ Failed to deploy ${appName}:`, error.message);
	}
}
