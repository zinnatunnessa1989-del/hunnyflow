exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'check-license works!' }) };
  }

  // সবসময় valid license
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      valid: true,
      plan: 'ultra',
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString()
    })
  };
};