const https = require('https');
const fs = require('fs');
const path = require('path');

// Aiven CA certificate URL
const CA_CERT_URL = 'https://console.aiven.io/static/ca.pem';
const CA_CERT_PATH = path.join(__dirname, 'ca-certificate.pem');

const downloadCACertificate = () => {
  console.log('📥 Downloading Aiven CA certificate...');
  
  const file = fs.createWriteStream(CA_CERT_PATH);
  
  https.get(CA_CERT_URL, (response) => {
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log('✅ CA certificate downloaded successfully!');
      console.log(`📄 Certificate saved to: ${CA_CERT_PATH}`);
      console.log('💡 Update database.js to use this certificate for production SSL connections.');
    });
  }).on('error', (error) => {
    fs.unlink(CA_CERT_PATH, () => {}); // Delete the file on error
    console.error('❌ Failed to download CA certificate:', error.message);
    console.log('⚠️  You can manually download the certificate from:');
    console.log('   https://console.aiven.io/static/ca.pem');
  });
};

// Check if certificate already exists
if (fs.existsSync(CA_CERT_PATH)) {
  console.log('✅ CA certificate already exists at:', CA_CERT_PATH);
} else {
  downloadCACertificate();
}
