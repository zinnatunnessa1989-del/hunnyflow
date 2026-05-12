const admin = require('firebase-admin');

if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  privateKey = privateKey.replace(/\\n/g, '\n').trim();
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'Function is working!' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, password } = body;
    
    if (!email || !password) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, error: 'Email and password required' }) };
    }

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).get();

    if (snapshot.empty) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid credentials' }) };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    if (userData.password !== password) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid credentials' }) };
    }

    if (!userData.verified) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Email not verified', needsVerify: true }) };
    }

    if (userData.blocked) {
      return { statusCode: 403, headers, body: JSON.stringify({ success: false, error: 'Account blocked' }) };
    }

    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userId: userDoc.id,
        email: userData.email,
        name: userData.name,
        token: token
      })
    };
  } catch (error) {
    console.error('Function error:', error);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        message: error.message 
      }) 
    };
  }
};