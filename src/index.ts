/* eslint-disable @typescript-eslint/naming-convention */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { verify } from '@octokit/webhooks-methods';
import { runDeploy } from './executor';
import { getAllRepos, upsertRepos } from './db';

if (!Bun.env.GITHUB_SECRET) {
	console.warn(
		'⚠️  Warning: GITHUB_SECRET is not set. Webhook signature verification will fail, and all incoming webhooks will be rejected. Please set GITHUB_SECRET in your environment variables to enable secure deployments.'
	);
}

const execAsync = promisify(exec);

const server = Bun.serve({
	port: Bun.env.PORT ?? 3000,
	routes: {
		'/': Bun.file('public/index.html'),
		'/favicon.svg': Bun.file('public/favicon.svg'),
		'/api/apps': async () => {
			try {
				const { stdout } = await execAsync('pm2 jlist');
				const json = stdout.split('\n').at(-1)!;
				const processes = JSON.parse(json) as {
					name: string;
					pm2_env?: { pm_uptime: number; restart_time: number; status: string };
				}[];

				const repos = getAllRepos();

				const fullRepos = repos.map((repo) => {
					const proc = processes.find((p: any) => p.name === repo.name);
					const { status, pm_uptime, restart_time } = proc?.pm2_env ?? {};
					return { ...repo, status, uptime: pm_uptime, restarts: restart_time };
				});

				return Response.json(fullRepos);
			} catch (error) {
				console.error('Failed to fetch PM2 list', error);
				return Response.json({ error: 'Internal Server Error' }, { status: 500 });
			}
		},
		'/webhook': async (req) => {
			const event = req.headers.get('x-github-event');
			const signature = req.headers.get('x-hub-signature-256');

			if (!event || !signature) {
				return Response.json({ error: 'Bad Request' }, { status: 400 });
			}

			const bodyText = await req.text();

			if (!(await verify(Bun.env.GITHUB_SECRET!, bodyText, signature))) {
				return Response.json({ error: 'Unauthorized' }, { status: 401 });
			}

			if (event === 'ping') {
				console.log('🔔 Received ping event from GitHub.');
				return Response.json({ message: 'Pong' });
			}

			if (event !== 'push') {
				return Response.json({ error: `Ignored event type: ${event}` }, { status: 200 });
			}

			try {
				const payload = JSON.parse(bodyText);
				const { name, url } = payload.repository;

				if (payload.ref === `refs/heads/main`) {
					console.log(`[Received] Valid push event to ${name}`);

					upsertRepos(name, url, new Date().toISOString());
					await runDeploy(name).catch((error) => console.error(`Unhandled deploy error for ${name}:`, error));

					return Response.json({ message: 'Deploy triggered asynchronously' }, { status: 202 });
				}

				return Response.json({ error: 'Ignored: push to wrong branch' }, { status: 200 });
			} catch (error: any) {
				console.error('Internal Server Error parsing webhook:', error.message);
				return Response.json({ error: 'Internal Server Error' }, { status: 500 });
			}
		}
	}
});

console.log(`✅ Webhook server listening on http://localhost:${server.port}/webhook`);
console.log(`📊 Dashboard available at http://localhost:${server.port}/`);
