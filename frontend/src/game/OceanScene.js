import Phaser from 'phaser';

const LANE_COLORS = [0xf86635, 0x3fb8e8, 0xa78bfa, 0x22c55e, 0xeab308, 0xec4899, 0x14b8a6, 0xf97316];

export default class OceanScene extends Phaser.Scene {
  constructor() {
    super('OceanScene');
    this.subs = {};
    this.bubbles = [];
    this.fish = [];
    this.pendingRunners = null;
    this.ready = false;
  }

  preload() {}

  create() {
    this.headerH = 30;
    this.footerH = 30;

    this.bg = this.add.graphics();
    this.rays = this.add.graphics();
    this.bubbleLayer = this.add.container(0, 0);
    this.fishLayer = this.add.container(0, 0);
    this.seabed = this.add.graphics();
    this.chestText = this.add.text(0, 0, '🏆', { fontSize: '26px' }).setOrigin(0.5);
    this.pathLines = this.add.graphics();
    this.subLayer = this.add.container(0, 0);

    this.makeBubbles();
    this.makeFish();
    this.drawScene();
    this.scale.on('resize', () => this.drawScene());

    this.ready = true;
    if (this.pendingRunners) {
      this.updateRunners(this.pendingRunners);
      this.pendingRunners = null;
    }
  }

  makeBubbles() {
    for (let i = 0; i < 22; i++) {
      const b = this.add.circle(0, 0, Phaser.Math.FloatBetween(2, 5), 0xffffff, Phaser.Math.FloatBetween(0.2, 0.5));
      this.bubbleLayer.add(b);
      this.bubbles.push({ obj: b, seedX: Phaser.Math.FloatBetween(0, 1), seedY: Phaser.Math.FloatBetween(0, 1), speed: Phaser.Math.FloatBetween(14, 34), wobble: Phaser.Math.FloatBetween(0.5, 1.5) });
    }
  }

  makeFish() {
    const colors = [0xffb703, 0xff5e5e, 0x8ecae6, 0xffd166];
    for (let i = 0; i < 4; i++) {
      const g = this.add.graphics();
      const c = colors[i % colors.length];
      g.fillStyle(c, 1);
      g.fillTriangle(-10, 0, 8, -6, 8, 6);
      g.fillTriangle(-10, 0, -18, -6, -18, 6);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(4, -1, 1.6);
      this.fishLayer.add(g);
      this.fish.push({ obj: g, seedY: Phaser.Math.FloatBetween(0.15, 0.75), speed: Phaser.Math.FloatBetween(20, 40) * (i % 2 === 0 ? 1 : -1), x: Phaser.Math.FloatBetween(0, 1) });
    }
  }

  drawScene() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.diveH = h - this.headerH - this.footerH;
    this.surfaceY = this.headerH;
    this.bedY = this.headerH + this.diveH;

    this.bg.clear();
    const bands = 24;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const r = Math.round(90 - t * 70);
      const g = Math.round(190 - t * 130);
      const b = Math.round(230 - t * 90);
      const color = (r << 16) + (g << 8) + b;
      this.bg.fillStyle(color, 1);
      this.bg.fillRect(0, this.surfaceY + (this.diveH / bands) * i, w, this.diveH / bands + 1);
    }
    this.bg.fillStyle(0x0a2a3a, 1);
    this.bg.fillRect(0, 0, w, this.headerH);

    this.rays.clear();
    this.rays.fillStyle(0xffffff, 0.08);
    for (let i = 0; i < 5; i++) {
      const rx = (w / 5) * i + 30;
      this.rays.fillTriangle(rx - 30, this.surfaceY, rx + 60, this.surfaceY, rx + 10, this.bedY * 0.7);
    }

    this.seabed.clear();
    this.seabed.fillStyle(0xd8b06a, 1);
    this.seabed.fillRect(0, this.bedY, w, this.footerH);
    this.seabed.fillStyle(0x2d6a4f, 1);
    for (let i = 0; i < 6; i++) {
      const sx = (w / 6) * i + 20;
      this.seabed.fillTriangle(sx, this.bedY, sx - 6, this.bedY - 22, sx + 3, this.bedY - 10);
      this.seabed.fillTriangle(sx + 8, this.bedY, sx + 2, this.bedY - 16, sx + 12, this.bedY - 6);
    }

    const chestX = w / 2;
    this.chestText.setPosition(chestX, this.bedY - 14);

    const laneCount = Math.max(Object.keys(this.subs).length, 1);
    this.pathLines.clear();
    this.pathLines.lineStyle(1, 0xffffff, 0.1);
    for (let i = 0; i < laneCount; i++) {
      let prevX = null;
      let prevY = null;
      for (let y = this.surfaceY + 20; y <= this.bedY - 20; y += 14) {
        const progress = ((y - (this.surfaceY + 34)) / ((this.bedY - 18) - (this.surfaceY + 34))) * 100;
        const x = this.xForSub(i, laneCount, progress);
        if (prevX !== null) this.pathLines.lineBetween(prevX, prevY, x, y);
        prevX = x;
        prevY = y;
      }
    }

    Object.values(this.subs).forEach((s) => this.layoutSub(s));
  }

  startXFor(index, total) {
    const laneW = this.scale.width / total;
    return laneW * index + laneW / 2;
  }

  xForSub(index, total, progress) {
    const startX = this.startXFor(index, total);
    const chestX = this.scale.width / 2;
    const t = Phaser.Math.Clamp(progress, 0, 100) / 100;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return startX + (chestX - startX) * ease;
  }

  yForProgress(progress) {
    const top = this.surfaceY + 34;
    const bottom = this.bedY - 18;
    return top + (Phaser.Math.Clamp(progress, 0, 100) / 100) * (bottom - top);
  }

  rotationForProgress(index, total, progress) {
    const eps = 1.5;
    let pA = Phaser.Math.Clamp(progress - eps, 0, 100);
    let pB = Phaser.Math.Clamp(progress + eps, 0, 100);
    if (pA === pB) pA = Phaser.Math.Clamp(pB - eps * 2, 0, 100);

    const xA = this.xForSub(index, total, pA);
    const yA = this.yForProgress(pA);
    const xB = this.xForSub(index, total, pB);
    const yB = this.yForProgress(pB);

    return Phaser.Math.Angle.Between(xA, yA, xB, yB);
  }

  makeSub(color) {
    const container = this.add.container(0, 0);

    const bubble = this.add.circle(20, -4, 4, 0xffffff, 0.5);

    const body = this.add.graphics();

    // Palmes à l'arrière (sens du déplacement = vers l'avant/+x)
    body.fillStyle(0xf97316, 1);
    body.fillTriangle(-14, 0, -25, -8, -19, 1);
    body.fillTriangle(-14, 0, -25, 8, -19, -1);

    // Jambes
    body.fillStyle(0x1f2937, 1);
    body.fillEllipse(-8, -3, 16, 5);
    body.fillEllipse(-8, 3, 16, 5);

    // Bouteille d'oxygène sur le dos
    body.fillStyle(0x9ca3af, 1);
    body.fillRoundedRect(-6, -12, 8, 16, 3);

    // Combinaison / torse
    body.fillStyle(color, 1);
    body.fillEllipse(2, 0, 22, 13);

    // Bras tendus vers l'avant
    body.fillStyle(color, 1);
    body.fillEllipse(14, -6, 12, 4);
    body.fillEllipse(14, 6, 12, 4);
    body.fillStyle(0xffe0bd, 1);
    body.fillCircle(19, -6, 2.5);
    body.fillCircle(19, 6, 2.5);

    // Tête + masque + tuba
    body.fillStyle(0xffe0bd, 1);
    body.fillCircle(13, 0, 6);
    body.fillStyle(0x1f2937, 1);
    body.fillEllipse(16, 0, 8, 7);
    body.fillStyle(0x7dd3fc, 0.9);
    body.fillEllipse(16, 0, 5, 5);
    body.fillStyle(0xef4444, 1);
    body.fillRoundedRect(9, -8, 6, 3, 1);

    container.add([body, bubble]);
    container.bubbleDot = bubble;
    return container;
  }

  layoutSub(s) {
    const x = this.xForSub(s.laneIndex, s.total, s.progress);
    const y = this.yForProgress(s.progress);
    const rotation = this.rotationForProgress(s.laneIndex, s.total, s.progress);
    s.sprite.setPosition(x, y);
    s.sprite.setRotation(rotation);
    s.nameTag.setPosition(x, y - 26);
    s.nameBg.setPosition(x, y - 26);
  }

  drawNameTag(s, name, reached) {
    s.nameTag.setText(name + (reached ? ' 🏆' : ' 🤿'));
    const w = s.nameTag.width + 20;
    s.nameBg.clear();
    s.nameBg.fillStyle(0xffffff, 1);
    s.nameBg.lineStyle(2, reached ? 0xffd700 : s.color, 1);
    s.nameBg.fillRoundedRect(-w / 2, -10, w, 20, 10);
    s.nameBg.strokeRoundedRect(-w / 2, -10, w, 20, 10);
  }

  updateRunners(runners) {
    if (!this.ready) {
      this.pendingRunners = runners;
      return;
    }
    const total = runners.length;

    runners.forEach((rr, i) => {
      let s = this.subs[rr.id];
      const color = LANE_COLORS[i % LANE_COLORS.length];
      const wasReached = s?.reached;
      const reached = rr.progress >= 100;

      if (!s) {
        const sprite = this.makeSub(color);
        this.subLayer.add(sprite);

        const nameBg = this.add.graphics();
        const nameTag = this.add.text(0, 0, rr.nom, {
          fontFamily: 'Arial',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#1a202c',
        }).setOrigin(0.5);

        s = { sprite, nameTag, nameBg, laneIndex: i, total, progress: 0, color, reached: false };
        this.subs[rr.id] = s;

        this.tweens.add({
          targets: sprite,
          y: '+=4',
          duration: 900 + i * 40,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: sprite.bubbleDot,
          alpha: { from: 0.5, to: 0 },
          x: '-=10',
          duration: 700,
          repeat: -1,
          ease: 'Sine.easeOut',
        });
      }

      s.laneIndex = i;
      s.total = total;
      this.drawNameTag(s, rr.nom, reached);

      const newX = this.xForSub(i, total, rr.progress);
      const newY = this.yForProgress(rr.progress);
      const newRotation = this.rotationForProgress(i, total, rr.progress);

      this.tweens.add({ targets: s.sprite, x: newX, y: newY, rotation: newRotation, duration: 900, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: [s.nameTag, s.nameBg], x: newX, y: newY - 26, duration: 900, ease: 'Sine.easeOut' });

      s.progress = rr.progress;

      if (reached && !wasReached) {
        this.celebrate(s);
      }
      s.reached = reached;
    });

    this.drawScene();
  }

  celebrate(s) {
    this.tweens.add({
      targets: s.sprite,
      scale: { from: 1, to: 1.3 },
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    for (let i = 0; i < 14; i++) {
      const dot = this.add.circle(
        s.sprite.x,
        s.sprite.y,
        4,
        [0xffd700, 0xf86635, 0x3fb8e8, 0x22c55e, 0xec4899][i % 5]
      );
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(40, 90);
      this.tweens.add({
        targets: dot,
        x: dot.x + Math.cos(angle) * dist,
        y: dot.y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 900,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }

    this.cameras.main.shake(180, 0.004);
  }

  update(time, delta) {
    this.bubbles.forEach((b) => {
      b.seedY -= (b.speed * (delta / 1000)) / this.diveH;
      if (b.seedY < 0) b.seedY = 1;
      const wobbleX = Math.sin(time * 0.002 * b.wobble + b.seedX * 10) * 6;
      b.obj.setPosition(b.seedX * this.scale.width + wobbleX, this.surfaceY + b.seedY * this.diveH);
    });

    this.fish.forEach((f) => {
      f.x += (f.speed * (delta / 1000)) / this.scale.width;
      if (f.x > 1.1) f.x = -0.1;
      if (f.x < -0.1) f.x = 1.1;
      f.obj.setPosition(f.x * this.scale.width, this.surfaceY + f.seedY * this.diveH);
      f.obj.setScale(f.speed < 0 ? -1 : 1, 1);
    });
  }
}