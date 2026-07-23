const express = require("express");
const router = express.Router();

const pool = require("../db");
const redis = require("../redis");

/*
 * GET ALL USERS
 */
router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM users");
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

/*
 * GET USER BY ID (Redis Cache)
 */
router.get("/:id", async (req, res, next) => {
  try {
    console.log("Request received");
    const id = req.params.id;
    console.log("Checking Redis");
    const cached = await redis.get(`user:${id}`);
    console.log("Redis returned:", cached);
    if (cached) {
      console.log("Cache Hit");
      return res.json(JSON.parse(cached));
    }
    console.log("Querying MySQL");
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id=?",
      [id]
    );
    console.log(rows);
    if (!rows.length)
      return res.status(404).json({ error: "Not Found" });
    console.log("Writing to Redis");
    await redis.setEx(
      `user:${id}`,
      60,
      JSON.stringify(rows[0])
    );
    console.log("Saved");
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    next(err);
  }
});
/*
 * CREATE USER
 */
router.post("/", async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const [result] = await pool.query(
      "INSERT INTO users (name, email) VALUES (?, ?)",
      [name, email]
    );

    res.status(201).json({
      id: result.insertId,
      name,
      email,
    });

  } catch (err) {
    next(err);
  }
});

/*
 * UPDATE USER
 */
router.put("/:id", async (req, res, next) => {
  try {
    const { name, email } = req.body;

    const [result] = await pool.query(
      "UPDATE users SET name=?, email=? WHERE id=?",
      [name, email, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Remove old cached value
    await redis.del(`user:${req.params.id}`);

    res.json({
      id: Number(req.params.id),
      name,
      email,
    });

  } catch (err) {
    next(err);
  }
});

/*
 * DELETE USER
 */
router.delete("/:id", async (req, res, next) => {
  try {

    const [result] = await pool.query(
      "DELETE FROM users WHERE id=?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Remove cached value
    await redis.del(`user:${req.params.id}`);

    res.sendStatus(204);

  } catch (err) {
    next(err);
  }
});

module.exports = router;