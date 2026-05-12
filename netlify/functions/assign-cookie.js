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
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'assign-cookie works!' }) };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      cookieSlot: {
        id: 'slot_' + Date.now(),
        gmail: 'account@gmail.com',
        assignedTo: 'user123',
        assignedAt: Date.now(),
        expiresAt: Date.now() + (30 * 86400000),
        isActive: true,
        cookie: 'SID=xxx; HSID=yyy; SSID=zzz'
      }
    })
  };
};