exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { salt, timestamp } = JSON.parse(event.body);

    if (Date.now() - timestamp > 5000) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Request expired' }) };
    }

    const MASTER_SECRET = process.env.MASTER_ENCRYPTION_KEY;
    
    if (!MASTER_SECRET) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server config error' }) };
    }

    const crypto = require('crypto');
    const dynamicKey = crypto
      .createHmac('sha256', MASTER_SECRET)
      .update(salt + Math.floor(Date.now() / 10000).toString())
      .digest('hex');

    return { statusCode: 200, headers, body: JSON.stringify({ key: dynamicKey, expiresIn: 3600 }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Internal error' }) };
  }
};