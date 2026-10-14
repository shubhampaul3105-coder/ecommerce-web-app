const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const readline = require('readline');

const db = new Database('shopease.db');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Admin name: ', name => {
  rl.question('Admin email: ', email => {
    rl.question('Admin password (minimum 6 characters): ', async password => {
      try {
        if (!name.trim() || !email.trim() || password.length < 6) {
          console.log('Please enter a name, valid email and password of at least 6 characters.');
        } else {
          const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase());

          if (existing) {
            console.log('This email already exists. Use a different email for the admin account.');
          } else {
            const hash = await bcrypt.hash(password, 10);
            db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
              name.trim(), email.trim().toLowerCase(), hash, 'Admin'
            );
            console.log('Admin account created successfully!');
          }
        }
      } catch (error) {
        console.log('Could not create admin account:', error.message);
      } finally {
        db.close();
        rl.close();
      }
    });
  });
});
