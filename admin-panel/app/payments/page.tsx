'use client';

import { useEffect, useState } from 'react';
import Shell from '../../components/AdminShell';
import { api } from '../../lib/api';

export default function Page() {
  const [data, setData] = useState<any[]>([]);

  const load = () => {
    return api('/admin/payments')
      .then(setData)
      .catch(() => {});
  };

  useEffect(() => {
    void load();
  }, []);

  async function act(id: string, action: 'approve' | 'reject') {
    await api(`/admin/payments/${id}/${action}`, {
      method: 'POST',
      body:
        action === 'reject'
          ? JSON.stringify({ reason: 'Rejected by admin' })
          : undefined,
    });

    await load();
  }

  return (
    <Shell>
      <h1>Payment Requests</h1>

      {data.map((item) => (
        <div className="card" key={item.id}>
          <b>
            {item.name} · {item.package_name}
          </b>

          <p>
            ₹{item.amount_inr} · {item.transaction_id} · {item.status}
          </p>

          {item.status === 'pending' && (
            <>
              <button
                className="button"
                onClick={() => act(item.id, 'approve')}
              >
                Approve
              </button>

              {' '}

              <button
                className="button"
                onClick={() => act(item.id, 'reject')}
              >
                Reject
              </button>
            </>
          )}
        </div>
      ))}
    </Shell>
  );
}
