export async function changeCoins(client, userId, delta, source, reason, referenceId, adminId) {
    const locked = await client.query('SELECT coin_balance FROM users WHERE id=$1 FOR UPDATE', [userId]);
    if (!locked.rowCount)
        throw new Error('User not found');
    const current = Number(locked.rows[0].coin_balance);
    const next = current + delta;
    if (next < 0)
        throw new Error('Insufficient coins');
    await client.query('UPDATE users SET coin_balance=$2, updated_at=now() WHERE id=$1', [userId, next]);
    const type = delta >= 0 ? 'credit' : 'debit';
    const coins = Math.abs(delta);
    const ledger = await client.query(`INSERT INTO wallet_transactions(user_id,type,coins,balance_after,source,reason,reference_id,admin_id)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [userId, type, coins, next, source, reason || null, referenceId || null, adminId || null]);
    return ledger.rows[0];
}
