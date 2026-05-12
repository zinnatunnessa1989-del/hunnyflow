const admin = require('firebase-admin');

if (!admin.apps.length) {
  // private key \n গুলো replace করো
  let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
  
  // \\n কে actual newline এ replace
  privateKey = privateKey.replace(/\\n/g, '\n');
  
  // শুরু ও শেষের extra space সরাও
  privateKey = privateKey.trim();
  
  // console log for debugging
  console.log('Private Key starts with:', privateKey.substring(0, 27));
  console.log('Private Key ends with:', privateKey.substring(privateKey.length - 25));
  console.log('Private Key length:', privateKey.length);
  
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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod === 'GET') {
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ 
        status: 'Function is working!',
        keyStart: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.substring(0, 27) : 'no key'
      }) 
    };
  }

  try {
    const { email, password } = JSON.parse(event.body);

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
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ 
        error: 'Internal error', 
        message: error.message 
      }) 
    };
  }
};