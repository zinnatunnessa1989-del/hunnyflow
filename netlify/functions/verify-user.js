const admin = require('firebase-admin');

if (!admin.apps.length) {
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  privateKey = privateKey.replace(/\\n/g, '\n').trim();
  
  console.log('Initializing with project:', process.env.FIREBASE_PROJECT_ID);
  console.log('Client email:', process.env.FIREBASE_CLIENT_EMAIL);
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  });
  console.log('Firebase initialized successfully');
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

    console.log('Looking for email:', email);
    
    // Try to get all users
    const usersRef = db.collection('users');
    const allUsers = await usersRef.limit(1).get();
    console.log('Firestore connection OK, sample size:', allUsers.size);

    const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).get();
    console.log('Query result size:', snapshot.size);

    if (snapshot.empty) {
      return { statusCode: 401, headers, body: JSON.stringify({ success: false, error: 'Invalid credentials' }) };
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    console.log('Found user:', userData.email);

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
    console.error('Function error:', error.message, error.stack);
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      }) 
    };
  }
};