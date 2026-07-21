const cron = require("node-cron");

function buildUserBatch(count = 1000, now = new Date()) {
  const baseTs = now.toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const users = [];

  for (let i = 0; i < count; i += 1) {
    const suffix = `${baseTs}-${String(i).padStart(4, "0")}`;
    users.push({
      name: `Dynamic User ${suffix}`,
      email: `dynamic-${suffix}@example.com`,
    });
  }

  return users;
}

async function insertUserBatch(pool, options = {}) {
  const batch = buildUserBatch(options.count || 1000, options.now);
  const values = batch.map((u) => [u.name, u.email]);

  if (!values.length) {
    return { inserted: 0 };
  }

  const [result] = await pool.query(
    "INSERT INTO users (name, email) VALUES ?",
    [values]
  );

  return { inserted: result.affectedRows || values.length };
}

function startUserInsertJob(pool, options = {}) {
  const cronExpression = options.cronExpression || process.env.USER_INSERT_CRON || "*/5 * * * *";
  const batchSize = Number(options.count || process.env.USER_INSERT_BATCH_SIZE || 1000);

  console.log(`User batch job scheduled with: ${cronExpression}, batch size: ${batchSize}`);

  return cron.schedule(
    cronExpression,
    async () => {
      try {
        const result = await insertUserBatch(pool, {
          ...options,
          count: batchSize,
        });
        console.log(`Inserted ${result.inserted} users`);
      } catch (err) {
        console.error("User batch insert failed:", err.message);
      }
    },
    {
      timezone: "UTC",
    }
  );
}

module.exports = {
  buildUserBatch,
  insertUserBatch,
  startUserInsertJob,
};