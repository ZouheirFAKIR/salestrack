import Phaser from 'phaser';

const LANE_COLORS = [0xf86635, 0x3fb8e8, 0xa78bfa, 0x22c55e, 0xeab308, 0xec4899, 0x14b8a6, 0xf97316];

export default class RocketScene extends Phaser.Scene {
  constructor() {
    super('RocketScene');
    this.rockets = {};
    this.stars = [];
    this.pendingRunners = null;
    this.ready = false;
  }

  preload() {}

  create() {
    this.footerH = 40;

    this.bg = this.add.graphics();
    this.starLayer = this.add.container(0, 0);
    this.planetLayer = this.add.graphics();
    this.moonLayer = this.add.graphics();
    this.pathLines = this.add.graphics();
    this.trophyText = this.add.text(0, 0, '🏆', { fontSize: '26px' }).setOrigin(0.5);
    this.rocketLayer = this.add.container(0, 0);

    this.makeStars();
    this.drawScene();
    this.scale.on('resize', () => this.drawScene());

    this.ready = true;
    if (this.pendingRunners) {
      this.updateRunners(this.pendingRunners);
      this.pendingRunners = null;
    }
  }

  makeStars() {
    for (let i = 0; i < 60; i++) {
      const star = this.add.circle(0, 0, Phaser.Math.FloatBetween(1, 2.4), 0xffffff, Phaser.Math.FloatBetween(0.4, 1));
      this.starLayer.add(star);
      this.stars.push({ obj: star, seedX: Phaser.Math.FloatBetween(0, 1), seedY: Phaser.Math.FloatBetween(0, 1) });
      this.tweens.add({
        targets: star,
        alpha: { from: star.alpha, to: Phaser.Math.FloatBetween(0.15, 0.4) },
        duration: Phaser.Math.Between(800, 2200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1500),
      });
    }
  }

  drawScene() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.climbH = h - this.footerH;
    this.baseY = this.climbH;
    this.topY = h * 0.1;

    this.bg.clear();
    const bands = 20;
    for (let i = 0; i < bands; i++) {
      const t = i / bands;
      const r = Math.round(6 + t * (30 - 6));
      const g = Math.round(8 + t * (20 - 8));
      const b = Math.round(28 + t * (58 - 28));
      const color = (r << 16) + (g << 8) + b;
      this.bg.fillStyle(color, 1);
      this.bg.fillRect(0, (this.climbH / bands) * i, w, this.climbH / bands + 1);
    }
    this.bg.fillStyle(0x1a1a2e, 1);
    this.bg.fillRect(0, this.baseY, w, this.footerH);
    this.bg.fillStyle(0x374151, 1);
    this.bg.fillRect(0, this.baseY - 4, w, 4);

    this.stars.forEach((s) => s.obj.setPosition(s.seedX * w, s.seedY * this.climbH));

    this.planetLayer.clear();
    this.planetLayer.fillStyle(0xf97316, 0.85);
    this.planetLayer.fillCircle(w * 0.15, this.climbH * 0.28, 22);
    this.planetLayer.lineStyle(4, 0xfbbf24, 0.7);
    this.planetLayer.strokeEllipse(w * 0.15, this.climbH * 0.28, 52, 14);
    this.planetLayer.fillStyle(0xa78bfa, 0.6);
    this.planetLayer.fillCircle(w * 0.85, this.climbH * 0.55, 14);

    this.moonLayer.clear();
    const moonX = w / 2;
    const moonY = this.topY;
    this.moonLayer.fillStyle(0xe5e7eb, 1);
    this.moonLayer.fillCircle(moonX, moonY, 30);
    this.moonLayer.fillStyle(0xcbd5e1, 0.7);
    this.moonLayer.fillCircle(moonX - 10, moonY - 6, 5);
    this.moonLayer.fillCircle(moonX + 8, moonY + 8, 4);
    this.moonLayer.fillCircle(moonX + 4, moonY - 12, 3);
    this.trophyText.setPosition(moonX, moonY - 40);

    const laneCount = Math.max(Object.keys(this.rockets).length, 1);
    this.pathLines.clear();
    this.pathLines.lineStyle(1, 0xffffff, 0.08);
    for (let i = 0; i < laneCount; i++) {
      let prevX = null;
      let prevY = null;
      for (let y = this.baseY; y >= this.topY + 40; y -= 14) {
        const progress = ((this.baseY - 18 - y) / ((this.baseY - 18) - (this.topY + 46))) * 100;
        const x = this.xForRocket(i, laneCount, progress);
        if (prevX !== null) this.pathLines.lineBetween(prevX, prevY, x, y);
        prevX = x;
        prevY = y;
      }
    }

    Object.values(this.rockets).forEach((r) => this.layoutRocket(r));
  }

  startXFor(index, total) {
    const laneW = this.scale.width / total;
    return laneW * index + laneW / 2;
  }

  xForRocket(index, total, progress) {
    const startX = this.startXFor(index, total);
    const moonX = this.scale.width / 2;
    const t = Phaser.Math.Clamp(progress, 0, 100) / 100;
    // easeInOut : reste sur sa voie au début, puis converge franchement vers la Lune en fin de course
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return startX + (moonX - startX) * ease;
  }

  rotationForProgress(index, total, progress) {
    const eps = 1.5;
    let pA = Phaser.Math.Clamp(progress - eps, 0, 100);
    let pB = Phaser.Math.Clamp(progress + eps, 0, 100);
    if (pA === pB) pA = Phaser.Math.Clamp(pB - eps * 2, 0, 100);

    const xA = this.xForRocket(index, total, pA);
    const yA = this.yForProgress(pA);
    const xB = this.xForRocket(index, total, pB);
    const yB = this.yForProgress(pB);

    // angle de déplacement, +90° car le sprite est dessiné le nez vers le haut
    return Phaser.Math.Angle.Between(xA, yA, xB, yB) + Math.PI / 2;
  }

  yForProgress(progress) {
    const bottom = this.baseY - 18;
    const top = this.topY + 46;
    return bottom - (Phaser.Math.Clamp(progress, 0, 100) / 100) * (bottom - top);
  }

  makeRocket(color) {
    const container = this.add.container(0, 0);

    const flame = this.add.graphics();
    flame.fillStyle(0xffb703, 1);
    flame.fillTriangle(-6, 20, 6, 20, 0, 36);
    flame.fillStyle(0xff5e00, 0.85);
    flame.fillTriangle(-4, 20, 4, 20, 0, 30);
    container.flame = flame;

    const body = this.add.graphics();
    body.fillStyle(color, 1);
    body.fillTriangle(-11, -14, 11, -14, 0, -30);
    body.fillRoundedRect(-11, -14, 22, 30, 6);
    body.fillStyle(0xbfe3ff, 1);
    body.fillCircle(0, -6, 6);
    body.fillStyle(0xe11d48, 1);
    body.fillTriangle(-11, 8, -20, 20, -11, 20);
    body.fillTriangle(11, 8, 20, 20, 11, 20);

    container.add([flame, body]);
    return container;
  }

  layoutRocket(r) {
    const x = this.xForRocket(r.laneIndex, r.total, r.progress);
    const y = this.yForProgress(r.progress);
    const rotation = this.rotationForProgress(r.laneIndex, r.total, r.progress);
    r.sprite.setPosition(x, y);
    r.sprite.setRotation(rotation);
    r.nameTag.setPosition(x, y + 34);
    r.nameBg.setPosition(x, y + 34);
  }

  drawNameTag(r, name, reached) {
    r.nameTag.setText(name + (reached ? ' 🏆' : ' 🚀'));
    const w = r.nameTag.width + 20;
    r.nameBg.clear();
    r.nameBg.fillStyle(0xffffff, 1);
    r.nameBg.lineStyle(2, reached ? 0xffd700 : r.color, 1);
    r.nameBg.fillRoundedRect(-w / 2, -10, w, 20, 10);
    r.nameBg.strokeRoundedRect(-w / 2, -10, w, 20, 10);
  }

  updateRunners(runners) {
    if (!this.ready) {
      this.pendingRunners = runners;
      return;
    }
    const total = runners.length;

    runners.forEach((rr, i) => {
      let r = this.rockets[rr.id];
      const color = LANE_COLORS[i % LANE_COLORS.length];
      const wasReached = r?.reached;
      const reached = rr.progress >= 100;

      if (!r) {
        const sprite = this.makeRocket(color);
        this.rocketLayer.add(sprite);

        const nameBg = this.add.graphics();
        const nameTag = this.add.text(0, 0, rr.nom, {
          fontFamily: 'Arial',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#1a202c',
        }).setOrigin(0.5);

        r = { sprite, nameTag, nameBg, laneIndex: i, total, progress: 0, color, reached: false };
        this.rockets[rr.id] = r;

        this.tweens.add({
          targets: sprite,
          x: '+=4',
          duration: 320 + i * 25,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
        this.tweens.add({
          targets: sprite.flame,
          scaleY: { from: 0.7, to: 1.25 },
          duration: 90,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      r.laneIndex = i;
      r.total = total;
      this.drawNameTag(r, rr.nom, reached);

      const newX = this.xForRocket(i, total, rr.progress);
      const newY = this.yForProgress(rr.progress);
      const newRotation = this.rotationForProgress(i, total, rr.progress);

      this.tweens.add({ targets: r.sprite, x: newX, y: newY, rotation: newRotation, duration: 900, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: [r.nameTag, r.nameBg], x: newX, y: newY + 34, duration: 900, ease: 'Sine.easeOut' });

      r.progress = rr.progress;

      if (reached && !wasReached) {
        this.celebrate(r);
      }
      r.reached = reached;
    });

    this.drawScene();
  }

  celebrate(r) {
    this.tweens.add({
      targets: r.sprite,
      scale: { from: 1, to: 1.3 },
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    for (let i = 0; i < 16; i++) {
      const dot = this.add.circle(
        r.sprite.x,
        r.sprite.y - 20,
        4,
        [0xffd700, 0xf86635, 0x3fb8e8, 0x22c55e, 0xec4899][i % 5]
      );
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.Between(40, 100);
      this.tweens.add({
        targets: dot,
        x: dot.x + Math.cos(angle) * dist,
        y: dot.y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 1000,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }

    this.cameras.main.shake(200, 0.005);
  }

  update() {}
}