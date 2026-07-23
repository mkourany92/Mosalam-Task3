const express = require("express");
const router = express.Router();

const pool = require("../db");
const redis = require("../redis");

console.log(redis);
console.log(redis.get);
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
    const id = req.params.id;

    // Check Redis first
    const cached = await redis.get(`user:${id}`);

    if (cached) {
      console.log(`Cache Hit: user:${id}`);
      return res.json(JSON.parse(cached));
    }

    console.log(`Cache Miss: user:${id}`);

    // Query MySQL
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Store in Redis for 60 seconds
    await redis.setEx(
      `user:${id}`,
      60,
      JSON.stringify(rows[0])
    );

    res.json(rows[0]);

  } catch (err) {
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