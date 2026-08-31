const crypto = require('crypto');

async function uploadImage(base64Data, folder) {
  console.log('>>> NOUVELLE VERSION DU FICHIER, PAS L\'ANCIEN SDK <<<');
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  const timestamp = Math.floor(Date.now() / 1000);
  const folderPath = `salestrack/${folder}`;

  const paramsToSign = `folder=${folderPath}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  const body = new URLSearchParams({
    file: base64Data,
    api_key: apiKey,
    timestamp: String(timestamp),
    folder: folderPath,
    signature,
  });

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || 'Erreur upload Cloudinary');
  }
  return { secure_url: data.secure_url };
}

module.exports = { uploadImage };