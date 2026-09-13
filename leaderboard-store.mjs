import { DatabaseSync } from 'node:sqlite';

export class LeaderboardStore {
  constructor(filename = 'lab8.sqlite') {
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS leaderboard (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_name TEXT NOT NULL,
        score INTEGER NOT NULL CHECK(score >= 0),
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_leaderboard_rank
        ON leaderboard(score DESC, occurred_at ASC, id ASC);
    `);
  }

  close() {
    this.db.close();
  }

  top(limit = 15) {
    return this.db.prepare(`
      SELECT id, player_name AS name, score, occurred_at AS occurredAt
      FROM leaderboard
      ORDER BY score DESC, occurred_at ASC, id ASC
      LIMIT ?
    `).all(limit);
  }

  add({ name, score, occurredAt = new Date().toISOString() }) {
    const cleanName = String(name ?? '').trim().slice(0, 20);
    const cleanScore = Math.max(0, Math.floor(Number(score)));
    if (!cleanName) throw new Error('player name is required');
    if (!Number.isFinite(cleanScore)) throw new Error('score must be numeric');

    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = this.db.prepare(`
        INSERT INTO leaderboard(player_name, score, occurred_at)
        VALUES (?, ?, ?)
      `).run(cleanName, cleanScore, occurredAt);
      const id = Number(result.lastInsertRowid);

      const rankRow = this.db.prepare(`
        SELECT COUNT(*) + 1 AS rank
        FROM leaderboard
        WHERE score > ?
           OR (score = ? AND occurred_at < ?)
           OR (score = ? AND occurred_at = ? AND id < ?)
      `).get(cleanScore, cleanScore, occurredAt, cleanScore, occurredAt, id);
      const rank = Number(rankRow.rank);
      const qualified = rank <= 15;

      this.db.exec(`
        DELETE FROM leaderboard
        WHERE id NOT IN (
          SELECT id FROM leaderboard
          ORDER BY score DESC, occurred_at ASC, id ASC
          LIMIT 15
        );
      `);
      this.db.exec('COMMIT');
      return { qualified, rank: qualified ? rank : null, leaderboard: this.top(15) };
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
