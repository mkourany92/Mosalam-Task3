const crypto = require("crypto");

function buildSeedUser({ now = new Date(), suffix } = {}) {
  const ts = now.toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  const safeSuffix = suffix || crypto.randomBytes(3).toString("hex");
  return {
    name: `Auto User ${ts}`,
    email: `auto-${ts}-${safeSuffix}@example.com`,
  };
}

async function insertSeedUser(pool, options = {}) {
  const payload = buildSeedUser(options);
  const [result] = await pool.query(
    "INSERT INTO users (name, email) VALUES (?, ?)",
    [payload.name, payload.email]
  );

  return { id: result.insertId, ...payload };
}

/*function startSeedJob(pool, options = {}) {
  const intervalMs =
    Number(options.intervalMs ?? process.env.DATA_JOB_INTERVAL_MS) ||
    1000 * 60 * 60 * 24 * 30 * 10;

  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    throw new Error("Invalid data job interval");
  }

  console.log(`Seed job started every ${intervalMs} ms`);

  return setInterval(async () => {
    try {
      const inserted = await insertSeedUser(pool, options);
      console.log("Seed job inserted user:", inserted);
    } catch (err) {
      console.error("Seed job failed:", err.message);
    }
  }, intervalMs);
}*/

module.exports = {
  buildSeedUser,
  insertSeedUser,
  //startSeedJob,
};