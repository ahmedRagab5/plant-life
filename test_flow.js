const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3000/api';
let token = null;

const testFlow = async () => {
  try {
    console.log('🍅 Starting Full Flow Test...\n');

    // 1. Register/Login
    console.log('1️⃣ Authenticating user...');
    try {
      const regRes = await axios.post(`${API_URL}/auth/register`, {
        name: 'Test User',
        email: 'test' + Date.now() + '@test.com',
        password: 'password123'
      });
      token = regRes.data.data.accessToken;
      console.log('✅ Registered new user');
    } catch (err) {
      console.error('❌ Auth failed:', err.response?.data || err.message);
      return;
    }

    // Set default headers
    const authHeaders = { Authorization: `Bearer ${token}` };

    // Connect Socket.IO
    console.log('\n2️⃣ Connecting to Socket.IO...');
    const socket = io('http://localhost:3000', {
      auth: { token }
    });
    
    socket.on('connect', () => console.log('✅ Socket connected:', socket.id));
    socket.on('notification', (data) => console.log('🔔 REAL-TIME NOTIFICATION RECEIVED:', data));

    // Wait a moment for socket to connect
    await new Promise(r => setTimeout(r, 1000));

    // 3. Upload Scan
    console.log('\n3️⃣ Uploading leaf image for scan...');
    const form = new FormData();
    form.append('images', fs.createReadStream(path.join(__dirname, 'test_leaf.jpg')));
    
    let scanId;
    try {
      const scanRes = await axios.post(`${API_URL}/scans`, form, {
        headers: { ...authHeaders, ...form.getHeaders() }
      });
      const scan = scanRes.data.data.scan;
      scanId = scan._id;
      console.log('✅ Scan created successfully!');
      console.log('  Disease:', scan.result.main_disease);
      console.log('  Severity:', scan.result.avg_severity_all_images);
      console.log('  Cloudinary URL:', scan.images[0].url);
    } catch (err) {
      console.error('❌ Scan failed:', err.response?.data || err.message);
      process.exit(1);
    }

    // 4. Accept Heal Plan
    console.log('\n4️⃣ Accepting heal plan for this scan...');
    let healPlanId;
    try {
      const planRes = await axios.post(`${API_URL}/heal-plans`, { scanId }, { headers: authHeaders });
      const plan = planRes.data.data.healPlan;
      healPlanId = plan._id;
      console.log('✅ Heal plan accepted!');
      console.log(`  Disease Template: ${plan.disease}`);
      console.log(`  Total Tasks: ${plan.tasks.length}`);
    } catch (err) {
      console.error('❌ Heal plan creation failed:', err.response?.data || err.message);
      process.exit(1);
    }

    // 5. Toggle a task
    console.log('\n5️⃣ Marking the first task as completed...');
    try {
      const toggleRes = await axios.patch(
        `${API_URL}/heal-plans/${healPlanId}/tasks/0`,
        {},
        { headers: authHeaders }
      );
      console.log('✅ Task toggled successfully!');
      console.log(`  Task 0 Status: ${toggleRes.data.data.healPlan.tasks[0].completed ? 'Done ✅' : 'Pending ⏳'}`);
    } catch (err) {
      console.error('❌ Task toggle failed:', err.response?.data || err.message);
    }

    console.log('\n6️⃣ Checking final user notifications...');
    try {
      const notifsRes = await axios.get(`${API_URL}/notifications`, { headers: authHeaders });
      console.log(`✅ Found ${notifsRes.data.data.notifications.length} notifications`);
    } catch (err) {
      console.error('❌ Notifications fetch failed:', err.response?.data || err.message);
    }

    console.log('\n🎉 Test Flow Completed Successfully!');
    setTimeout(() => process.exit(0), 1000); // give socket a moment to drain

  } catch (err) {
    console.error('Unhandled error:', err.message);
    process.exit(1);
  }
};

testFlow();
