import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";

const app = express();
app.use(
  bodyParser.json({
    limit: "50mb",
  })
);
app.use(
  bodyParser.raw({
    // type: "application/octet-stream",
    type: "application/json",
  })
);
app.use(
  cors({
    origin: "http://localhost:5173",
    exposedHeaders: ["key"],
  })
);

app.get("/", (_, res) => {
  res.send("Hello World!");
});

async function generateKey() {
  return await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 128,
    },
    true, // apakah kunci dapat diekspor
    ["encrypt", "decrypt"]
  );
}

async function importKey(jwk: string) {
  return await crypto.subtle.importKey(
    "jwk",
    {
      alg: "A128GCM",
      ext: true,
      k: jwk,
      key_ops: ["encrypt", "decrypt"],
      kty: "oct",
    },
    {
      name: "AES-GCM",
      length: 128,
    },
    false, // extractable
    ["decrypt"]
  );
}

async function exportKey(key: CryptoKey) {
  return await crypto.subtle.exportKey("jwk", key);
}

async function encryptData(key: CryptoKey, data: string | undefined) {
  const encodedData = new TextEncoder().encode(data);
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    key,
    encodedData
  );

  const exportedKey = await exportKey(key);
  return { key: exportedKey.k, data: encryptedData };
}

async function decryptData(jwk: string, encryptedData: BufferSource) {
  const jwkey = await importKey(jwk);
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    jwkey,
    encryptedData
  );

  return new TextDecoder().decode(new Uint8Array(decryptedData));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Decode the Base64 string to a binary string
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  // Convert binary string to Uint8Array
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Return the ArrayBuffer
  return bytes.buffer;
}

app.post("/test-enkrip", async (req, res) => {
  const data = req.body;
  const jwk = req.query.key as string;

  const response = await decryptData(
    jwk,
    data instanceof ArrayBuffer ? data : new Uint8Array(data)
  );
  console.log("decryptedData2 = ", response);

  const encodedData = new TextEncoder().encode(response);
  const keyForEnc = await generateKey();
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(12),
    },
    keyForEnc,
    encodedData
  );

  const exportedKey = await exportKey(keyForEnc);
  res.set("key", exportedKey.k);
  res.writeHead(200, "ok", {
    "Content-Type": "application/octet-stream",
  });
  res.end(new Uint8Array(encryptedData));
});

app.post("/test-enkripsi", async (req, res) => {
  const { data } = req.body;
  const jwk = req.query.key as string;

  console.log("data = ", data);
  console.log("data base64ToArrayBuffer = ", base64ToArrayBuffer(data));
  console.log("jwk = ", jwk);

  const response = await decryptData(
    jwk,
    base64ToArrayBuffer(data) instanceof ArrayBuffer
      ? base64ToArrayBuffer(data)
      : new Uint8Array(data)
  );
  console.log("decryptedData2 = ", response);

  const keyForEnc = await generateKey();
  const encryptedData = await encryptData(keyForEnc, response);

  console.log("encryptedData = ", encryptedData);

  res.set("key", encryptedData.key);
  res.writeHead(200, "ok", {
    "Content-Type": "application/octet-stream",
  });
  res.end(new Uint8Array(encryptedData.data));
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
