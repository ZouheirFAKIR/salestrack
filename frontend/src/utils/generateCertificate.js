import yealeadLogo from '../assets/yealead.png';

export function buildCertificateDataUrl({ userName, courseTitle, date }) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const width = 1400;
    const height = 990;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#fffaf7');
    bgGradient.addColorStop(1, '#fff1e8');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    const borderMargin = 36;
    ctx.strokeStyle = '#f86635';
    ctx.lineWidth = 4;
    ctx.strokeRect(borderMargin, borderMargin, width - borderMargin * 2, height - borderMargin * 2);
    ctx.strokeStyle = 'rgba(248,102,53,0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(borderMargin + 12, borderMargin + 12, width - (borderMargin + 12) * 2, height - (borderMargin + 12) * 2);

    ctx.fillStyle = '#f86635';
    [[borderMargin, borderMargin], [width - borderMargin, borderMargin], [borderMargin, height - borderMargin], [width - borderMargin, height - borderMargin]].forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    const centerX = width / 2;

    const logoImg = new Image();
    const finish = () => {
      drawTextContent();
      resolve(canvas.toDataURL('image/png'));
    };
    logoImg.onload = () => {
      const logoSize = 90;
      ctx.drawImage(logoImg, centerX - logoSize / 2, 70, logoSize, logoSize);
      finish();
    };
    logoImg.onerror = finish;
    logoImg.src = yealeadLogo;

    function drawTextContent() {
      ctx.textAlign = 'center';

      ctx.fillStyle = '#1a1a1a';
      ctx.font = '600 22px Arial';
      ctx.fillText('YEALEAD', centerX, 195);

      ctx.fillStyle = '#f86635';
      ctx.font = '700 46px Georgia';
      ctx.fillText('ATTESTATION DE RÉUSSITE', centerX, 270);

      ctx.strokeStyle = '#f86635';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 90, 295);
      ctx.lineTo(centerX + 90, 295);
      ctx.stroke();

      ctx.fillStyle = '#8a7a72';
      ctx.font = '18px Arial';
      ctx.fillText('Ce certificat est décerné à', centerX, 380);

      ctx.fillStyle = '#1a1a1a';
      ctx.font = 'italic 700 62px Georgia';
      ctx.fillText(userName, centerX, 460);

      const nameWidth = ctx.measureText(userName).width;
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - nameWidth / 2 - 20, 480);
      ctx.lineTo(centerX + nameWidth / 2 + 20, 480);
      ctx.stroke();

      ctx.fillStyle = '#8a7a72';
      ctx.font = '18px Arial';
      ctx.fillText('pour avoir complété avec succès la formation', centerX, 540);

      ctx.fillStyle = '#1a1a1a';
      ctx.font = '700 32px Arial';
      wrapText(ctx, courseTitle, centerX, 590, 900, 40);

      ctx.fillStyle = '#8a7a72';
      ctx.font = '16px Arial';
      ctx.fillText(date, centerX, 700);

      ctx.textAlign = 'right';
      const sigX = width - borderMargin - 120;
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.moveTo(sigX - 160, height - 130);
      ctx.lineTo(sigX + 40, height - 130);
      ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '600 16px Arial';
      ctx.fillText("L'équipe Yealead", sigX + 40, height - 105);
      ctx.font = '13px Arial';
      ctx.fillStyle = '#8a7a72';
      ctx.fillText('SalesTrack — Formation continue', sigX + 40, height - 85);
      ctx.textAlign = 'center';
    }

    function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
      const words = text.split(' ');
      let line = '';
      const lines = [];
      words.forEach((word) => {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line !== '') {
          lines.push(line);
          line = word + ' ';
        } else {
          line = testLine;
        }
      });
      lines.push(line);
      const startY = y - ((lines.length - 1) * lineHeight) / 2;
      lines.forEach((l, i) => ctx.fillText(l.trim(), x, startY + i * lineHeight));
    }
  });
}

export async function downloadCertificate({ userName, courseTitle, date }) {
  const dataUrl = await buildCertificateDataUrl({ userName, courseTitle, date });
  const link = document.createElement('a');
  link.download = `Attestation_${courseTitle.replace(/[^a-z0-9]/gi, '_')}.png`;
  link.href = dataUrl;
  link.click();
}