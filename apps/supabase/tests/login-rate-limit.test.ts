import assert from 'node:assert/strict';
import { PGlite } from 'npm:@electric-sql/pglite@0.5.10';

Deno.test('SQL: límites persistentes, reinicio de ventana y permisos', async () => {
  const database = new PGlite();
  try {
    await database.exec(
      'create role anon; create role authenticated; create role service_role bypassrls;',
    );
    const sql = await Deno.readTextFile(
      new URL('../migrations/20261018222026_login_run_rate_limit.sql', import.meta.url),
    );
    await database.exec(sql);
    for (const role of ['anon', 'authenticated']) {
      await database.exec(`set role ${role}`);
      await assert.rejects(database.query("select public.consume_login_attempt('global')"));
      await assert.rejects(database.query('select * from private.login_attempt'));
      await database.exec('reset role');
    }

    const bucket = `run:${'a'.repeat(64)}`;
    await database.exec('set role service_role');
    const attempts = await Promise.all(
      Array.from(
        { length: 10 },
        () =>
          database.query<{ allowed: boolean }>(
            'select public.consume_login_attempt($1) as allowed',
            [
              bucket,
            ],
          ),
      ),
    );
    assert.equal(attempts.filter((result) => result.rows[0].allowed).length, 8);
    for (let attempt = 1; attempt <= 301; attempt++) {
      const result = await database.query<{ allowed: boolean }>(
        "select public.consume_login_attempt('global') as allowed",
      );
      assert.equal(result.rows[0].allowed, attempt <= 300);
    }
    await database.query(
      "update private.login_attempt set window_started_at = now() - interval '16 minutes' where bucket = $1",
      [bucket],
    );
    const renewed = await database.query<{ allowed: boolean }>(
      'select public.consume_login_attempt($1) as allowed',
      [bucket],
    );
    assert.equal(renewed.rows[0].allowed, true);
    const row = await database.query<{ attempts: number }>(
      'select attempts from private.login_attempt where bucket = $1',
      [bucket],
    );
    assert.equal(row.rows[0].attempts, 1);
  } finally {
    await database.close();
  }
});
