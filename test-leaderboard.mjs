import assert from 'node:assert/strict';
import { LeaderboardStore } from './leaderboard-store.mjs';

const store = new LeaderboardStore(':memory:');
try {
  for (let i = 0; i < 20; i++) {
    store.add({ name: `P${i}`, score: i * 100, occurredAt: `2026-09-13T10:${String(i).padStart(2,'0')}:00.000Z` });
  }
  const top = store.top();
  assert.equal(top.length, 15);
  assert.equal(top[0].score, 1900);
  assert.equal(top[14].score, 500);
  assert.equal(top.some((row) => row.score < 500), false);

  const low = store.add({ name: 'LOW', score: 10, occurredAt: '2026-09-13T11:00:00.000Z' });
  assert.equal(low.qualified, false);
  assert.equal(store.top().length, 15);

  const tieEarly = store.add({ name: 'TIE-EARLY', score: 2000, occurredAt: '2026-09-13T09:00:00.000Z' });
  const tieLate = store.add({ name: 'TIE-LATE', score: 2000, occurredAt: '2026-09-13T12:00:00.000Z' });
  assert.equal(tieEarly.qualified, true);
  assert.equal(tieLate.qualified, true);
  const tied = store.top().filter((row) => row.score === 2000);
  assert.deepEqual(tied.map((row) => row.name), ['TIE-EARLY', 'TIE-LATE']);

  const sameTimeA = store.add({ name: 'SAME-A', score: 2100, occurredAt: '2026-09-13T08:00:00.000Z' });
  const sameTimeB = store.add({ name: 'SAME-B', score: 2100, occurredAt: '2026-09-13T08:00:00.000Z' });
  assert.equal(sameTimeA.rank, 1);
  assert.equal(sameTimeB.rank, 2);
  assert.deepEqual(store.top().slice(0,2).map((row) => row.name), ['SAME-A', 'SAME-B']);

  assert.throws(() => store.add({ name: '', score: 100 }), /player name/);
  console.log('LAB-8 leaderboard store tests: OK');
} finally {
  store.close();
}
