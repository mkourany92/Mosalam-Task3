const express = require("express");
const pool = require("./db");
const usersRouter = require("./routes/users");
//const { startSeedJob } = require("./jobs/userSeedJob");
const { startUserInsertJob } = require("./jobs/insertUserJob");

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.get("/api/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ready: true });
  } catch (err) {
    res.status(503).json({ ready: false });
  }
});

app.use("/api/users", usersRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`backend listening on ${PORT}`);

  startUserInsertJob(pool, {
    cronExpression: process.env.USER_INSERT_CRON || "*/5 * * * *",
    count: Number(process.env.USER_INSERT_BATCH_SIZE || 50),
  });

  /*startSeedJob(pool, {
    intervalMs: process.env.DATA_JOB_INTERVAL_MS || 50 * 60 * 60 * 24 * 30 * 10,
  });*/
});