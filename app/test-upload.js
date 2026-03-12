const fs = require('fs');
const path = require('path');

// get admin token
async function testUpload() {
  const loginRes = await fetch("http://localhost:8081/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@shop.dev", password: "password123" }) // assume standard test creds
  });
  const loginData = await loginRes.json();
  const token = loginData?.data?.token || loginData?.token;
  
  if(!token) {
    console.log("No token", loginData);
    return;
  }

  // Create a dummy image
  const formData = new FormData();
  const blob = new Blob(['helloworld'], { type: 'image/jpeg' });
  formData.append('file', blob, 'test.jpg');
  
  // Test chat upload
  const chatUploadRes = await fetch("http://localhost:8081/api/v1/chat/upload", {
    method: "POST",
    headers: {
        "Authorization": "Bearer " + token
    },
    body: formData
  });
  console.log("Chat Upload:", chatUploadRes.status, await chatUploadRes.text());

  // Test avatar upload
  const formData2 = new FormData();
  formData2.append('avatar', blob, 'test.jpg');
  const avatarUploadRes = await fetch("http://localhost:8081/api/v1/users/avatar", {
    method: "POST",
    headers: {
        "Authorization": "Bearer " + token
    },
    body: formData2
  });
  console.log("Avatar Upload:", avatarUploadRes.status, await avatarUploadRes.text());
}

testUpload();
