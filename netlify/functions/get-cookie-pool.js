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
    return { statusCode: 200, headers, body: JSON.stringify({ status: 'get-cookie-pool is working!' }) };
  }

  try {
    const accountsRef = db.collection('accounts');
    const snapshot = await accountsRef.get();
    const accounts = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      accounts.push({
        id: doc.id,
        gmail: data.gmail || '',
        cookie: data.cookie || '',
        assignedUsers: data.assignedUsers || [],
        maxSlots: data.maxSlots || 20,
        isActive: data.active || false
      });
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        data: accounts,
        hash: 'ok'
      })
    };
  } catch (error) {
    return { 
      statusCode: 500, 
      headers, 
      body: JSON.stringify({ error: 'Internal error', message: error.message }) 
    };
  }
};