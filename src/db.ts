/* eslint-disable @typescript-eslint/naming-convention */
// eslint-disable-next-line import/no-unresolved
import { Database } from 'bun:sqlite';

export const db = new Database('repos.db');

db.run(`
    CREATE TABLE IF NOT EXISTS apps (
        name TEXT PRIMARY KEY,
        url TEXT,
        last_push DATETIME
    )
`);

export interface RepoRecord {
	last_push: string;
	name: string;
	url: string;
}

export function upsertRepos(name: string, repoUrl: string, lastPush: string) {
	db.query(
		`
		INSERT INTO apps (name, url, last_push)
		VALUES ($name, $url, $last_push)
		ON CONFLICT(name) DO UPDATE SET
			url = excluded.url,
			last_push = excluded.last_push
	`
	).run({ $name: name, $url: repoUrl, $last_push: lastPush });
}

export function getAllRepos(): RepoRecord[] {
	return db.query(`SELECT * FROM apps`).all() as RepoRecord[];
}
