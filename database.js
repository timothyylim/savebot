require('dotenv').config()
const sqlite3 = require('sqlite3').verbose()
const MESSAGE_TABLE = process.env.MESSAGE_TABLE
const db = new sqlite3.Database('./data/db')

function Database () {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS ${MESSAGE_TABLE} (
      ts INT NOT NULL,
      message TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_real_name TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      channel_real_name TEXT NOT NULL
    )`)
  })
}

Database.prototype.insertMessage = function (messageObject, cb) {
  db.run(`INSERT INTO ${MESSAGE_TABLE} (
    ts,
    message,
    user_id,
    user_real_name,
    channel_id,
    channel_real_name
  ) VALUES (?,?,?,?,?,?);`, [
      messageObject.ts,
      messageObject.message,
      messageObject.user_id,
      messageObject.user_real_name,
      messageObject.channel_id,
      messageObject.channel_real_name
    ], (err) => {
    cb(err)
  })
}

module.exports = Database
