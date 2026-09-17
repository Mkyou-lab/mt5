const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

// ADD VALIDATION
if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY environment variable is required!');
  console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

if (process.env.ENCRYPTION_KEY.length !== 64) {
  console.error('❌ ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  process.exit(1);
}

const SECRET_KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

class Encryption {
  static encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex')
    };
  }

  static decrypt(encryptedObj) {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      SECRET_KEY,
      Buffer.from(encryptedObj.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedObj.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = Encryption;
