const mysql = require('mysql2');

const dbConfig = {
  host: 'agrovia-sheharagamage2002-1cc3.c.aivencloud.com',
  user: 'avnadmin',
  password: 'AVNS_iOtAXIKDXzwb0S4k4dm',
  database: 'defaultdb',
  port: 12267,
  ssl: {
    rejectUnauthorized: false
  }
};

const connection = mysql.createConnection(dbConfig);

connection.execute('DESCRIBE subscription_tiers', (err, results) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('subscription_tiers structure:');
    console.table(results);
  }
  
  connection.execute('DESCRIBE option_definitions', (err, results) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('\noption_definitions structure:');
      console.table(results);
    }
    connection.end();
  });
});
