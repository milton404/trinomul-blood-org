import('@/lib/db').then(() => console.log('ok')).catch((e) => { console.error(e); process.exit(1); });
