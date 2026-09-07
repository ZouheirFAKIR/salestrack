import Phaser from 'phaser';
import climb1Img from '../assets/runners-test/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_climb1.png';
import climb2Img from '../assets/runners-test/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_climb2.png';
import cheer1Img from '../assets/runners-test/kenney_platformer-characters/PNG/Adventurer/Poses/adventurer_cheer1.png';
import skyImg from '../assets/mountain/sky.png';
import bgMountainsImg from '../assets/mountain/background_glacial_mountains.png';
import mountainsImg from '../assets/mountain/glacial_mountains.png';
import cloudsBgImg from '../assets/mountain/clouds_bg.png';
import cloudsMg1Img from '../assets/mountain/clouds_mg_1.png';
import cloudsMg2Img from '../assets/mountain/clouds_mg_2.png';
import cloudsMg3Img from '../assets/mountain/clouds_mg_3.png';
import cloudLonelyImg from '../assets/mountain/cloud_lonely.png';

const LANE_COLORS = [0xf86635, 0x3fb8e8, 0xa78bfa, 0x22c55e, 0xeab308, 0xec4899, 0x14b8a6, 0xf97316];

export default class MountainScene extends Phaser.Scene {
  constructor() {
    super('MountainScene');
    this.climbers = {};
    this.floatingClouds = [];
    this.pendingRunners = null;
    this.ready = false;
  }

  preload() {
    this.load.image('climb1', climb1Img);
    this.load.image('climb2', climb2Img);
    this.load.image('cheer1', cheer1Img);
    this.load.image('sky', skyImg);
    this.load.image('bgMountains', bgMountainsImg);
    this.load.image('mountains', mountainsImg);
    this.load.image('cloudsBg', cloudsBgImg);
    this.load.image('cloudsMg1', cloudsMg1Img);
    this.load.image('cloudsMg2', cloudsMg2Img);
    this.load.image('cloudsMg3', cloudsMg3Img);
    this.load.image('cloudLonely', cloudLonelyImg);
  }

  create() {
    this.footerH = 44;

    this.skyImage = this.add.image(0, 0, 'sky').setOrigin(0, 0);
    this.bgMountainsImage = this.add.image(0, 0, 'bgMountains').setOrigin(0.5, 1);

    // Couche de nuages de fond — deux copies bout à bout qui défilent ensemble (boucle infinie, sans coupure)
    this.cloudsBgA = this.add.image(0, 0, 'cloudsBg').setOrigin(0, 0).setAlpha(0.55);
    this.cloudsBgB = this.add.image(0, 0, 'cloudsBg').setOrigin(0, 0).setAlpha(0.55);
    this.cloudsBgSpeed = 6;

    this.mountainsImage = this.add.image(0, 0, 'mountains').setOrigin(0.5, 1);

    // Petits nuages isolés qui dérivent au premier plan
    ['cloudsMg1', 'cloudsMg2', 'cloudsMg3', 'cloudLonely'].forEach((key) => {
      const img = this.add.image(-999, -999, key).setAlpha(0.9);
      this.floatingClouds.push({
        img,
        speed: Phaser.Math.FloatBetween(5, 14),
        placed: false,
        seedY: Phaser.Math.FloatBetween(0.05, 0.3),
      });
    });

    this.pathLines = this.add.graphics();
    this.trophyText = this.add.text(0, 0, '🏆', { fontSize: '30px' }).setOrigin(0.5);
    this.climberLayer = this.add.container(0, 0);

    this.drawScene();
    this.scale.on('resize', () => this.drawScene());

    this.ready = true;
    if (this.pendingRunners) {
      this.updateRunners(this.pendingRunners);
      this.pendingRunners = null;
    }
  }

  drawScene() {
    const w = this.scale.width;
    const h = this.scale.height;
    this.climbH = h - this.footerH;
    this.baseY = this.climbH;
    this.peakY = h * 0.08;
    this.mountainW = w;

    this.skyImage.setDisplaySize(w, h);

    this.bgMountainsImage.setPosition(w / 2, this.baseY);
    this.bgMountainsImage.setDisplaySize(w * 1.05, h * 0.62);

    // Redimensionne les nuages de fond en gardant leurs proportions, puis les recolle bout à bout
    const cloudBandH = h * 0.32;
    const cloudScale = cloudBandH / this.cloudsBgA.height;
    this.cloudsBgA.setScale(cloudScale);
    this.cloudsBgB.setScale(cloudScale);
    this.cloudsBgA.setPosition(this.cloudsBgA.x || 0, h * 0.04);
    this.cloudsBgB.setPosition((this.cloudsBgA.x || 0) + this.cloudsBgA.displayWidth, h * 0.04);

    this.mountainsImage.setPosition(w / 2, this.baseY);
    this.mountainsImage.setDisplaySize(w * 1.05, h * 0.8);

    // Nuages isolés — taille fixe et raisonnable peu importe la taille source du PNG
    this.floatingClouds.forEach((c) => {
      const targetW = Phaser.Math.Between(90, 160);
      c.img.setScale(targetW / c.img.width);
      if (!c.placed) {
        c.img.setPosition(Phaser.Math.Between(0, w), h * c.seedY);
        c.placed = true;
      }
    });

    this.trophyText.setPosition(w / 2, this.peakY + 16);

    const laneCount = Math.max(Object.keys(this.climbers).length, 1);
    this.pathLines.clear();
    this.pathLines.lineStyle(3, 0x6b4a2f, 0.4);
    for (let i = 0; i < laneCount; i++) {
      for (let y = this.baseY - 12; y > this.peakY + 24; y -= 22) {
        const progress = this.progressForY(y);
        const x = this.xForClimber(i, laneCount, progress);
        this.pathLines.lineBetween(x, y, x, y - 10);
      }
    }

    Object.values(this.climbers).forEach((c) => this.layoutClimber(c));
  }

  yForProgress(progress) {
    const bottom = this.baseY - 20;
    const top = this.peakY + 34;
    return bottom - (Phaser.Math.Clamp(progress, 0, 100) / 100) * (bottom - top);
  }

  progressForY(y) {
    const bottom = this.baseY - 20;
    const top = this.peakY + 34;
    return Phaser.Math.Clamp(((bottom - y) / (bottom - top)) * 100, 0, 100);
  }

  mountainBoundsAtY(y) {
    const h = Phaser.Math.Clamp((this.baseY - y) / (this.baseY - this.peakY), 0, 1);
    const halfBase = this.mountainW * 0.4;
    const halfWidth = halfBase * (1 - h) + 12;
    const cx = this.mountainW / 2;
    return { left: cx - halfWidth, right: cx + halfWidth };
  }

  xForClimber(index, total, progress) {
    const y = this.yForProgress(progress);
    const { left, right } = this.mountainBoundsAtY(y);
    const inset = (right - left) * 0.18;
    const l = left + inset;
    const r = right - inset;
    if (total <= 1) return (l + r) / 2;
    return l + ((r - l) / (total - 1)) * index;
  }

  makeClimber(color) {
    const container = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 24, 30, 8, 0x000000, 0.3);

    const body = this.add.graphics();

    // Piolet
    body.lineStyle(2, 0x9ca3af, 1);
    body.lineBetween(-14, -6, -14, 18);
    body.fillStyle(0x6b7280, 1);
    body.fillTriangle(-14, -10, -20, -6, -8, -6);

    // Jambes + bottes de neige
    body.fillStyle(0x1a1a2e, 1);
    body.fillRoundedRect(-8, 6, 6, 15, 3);
    body.fillRoundedRect(2, 6, 6, 15, 3);
    body.fillStyle(0xf3f4f6, 1);
    body.fillRoundedRect(-9, 18, 8, 5, 2);
    body.fillRoundedRect(1, 18, 8, 5, 2);

    // Sac à dos + sangle
    body.fillStyle(0x374151, 1);
    body.fillRoundedRect(-17, -9, 7, 16, 3);
    body.fillStyle(0xef4444, 1);
    body.fillRect(-17, -4, 7, 2);

    // Veste
    body.fillStyle(color, 1);
    body.fillRoundedRect(-10, -12, 20, 20, 6);

    // Écharpe
    body.fillStyle(0xffffff, 1);
    body.fillRoundedRect(-9, -13, 18, 4, 2);

    // Tête
    body.fillStyle(0xffe0bd, 1);
    body.fillCircle(0, -20, 7);

    // Bonnet + pompon
    body.fillStyle(color, 1);
    body.fillRoundedRect(-8, -27, 16, 8, 4);
    body.fillStyle(0xffffff, 1);
    body.fillCircle(0, -27, 2.5);

    container.add([shadow, body]);
    return container;
  }

  layoutClimber(c) {
    const y = this.yForProgress(c.progress);
    const x = this.xForClimber(c.laneIndex, c.total, c.progress);
    c.sprite.setPosition(x, y);
    c.nameTag.setPosition(x, y - 34);
    c.nameBg.setPosition(x, y - 34);
  }

  drawNameTag(c, name, reached) {
    c.nameTag.setText(name + (reached ? ' 🏆' : ''));
    const w = c.nameTag.width + 20;
    c.nameBg.clear();
    c.nameBg.fillStyle(0xffffff, 1);
    c.nameBg.lineStyle(2, reached ? 0xffd700 : c.color, 1);
    c.nameBg.fillRoundedRect(-w / 2, -10, w, 20, 10);
    c.nameBg.strokeRoundedRect(-w / 2, -10, w, 20, 10);
  }

  updateRunners(runners) {
    if (!this.ready) {
      this.pendingRunners = runners;
      return;
    }
    const total = runners.length;

    runners.forEach((r, i) => {
      let c = this.climbers[r.id];
      const color = LANE_COLORS[i % LANE_COLORS.length];
      const wasReached = c?.reached;
      const reached = r.progress >= 100;

      if (!c) {
        const sprite = this.makeClimber(color);
        this.climberLayer.add(sprite);

        const nameBg = this.add.graphics();
        const nameTag = this.add.text(0, 0, r.nom, {
          fontFamily: 'Arial',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#1a202c',
        }).setOrigin(0.5);

        c = { sprite, nameTag, nameBg, laneIndex: i, total, progress: 0, color, reached: false };
        this.climbers[r.id] = c;

        this.time.addEvent({
          delay: 260,
          loop: true,
          callback: () => {
            if (c.reached) return;
            c.frameToggle = !c.frameToggle;
            c.sprite.spriteBody.setTexture(c.frameToggle ? 'climb2' : 'climb1');
          },
        });
      }

      c.laneIndex = i;
      c.total = total;
      this.drawNameTag(c, r.nom, reached);

      const newX = this.xForClimber(i, total, r.progress);
      const newY = this.yForProgress(r.progress);

      this.tweens.add({ targets: c.sprite, x: newX, y: newY, duration: 900, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: [c.nameTag, c.nameBg], x: newX, y: newY - 34, duration: 900, ease: 'Sine.easeOut' });

      c.progress = r.progress;

      if (reached && !wasReached) {
        c.sprite.spriteBody.setTexture('cheer1');
        this.celebrate(c);
      }
      c.reached = reached;
    });

    this.drawScene();
  }

  celebrate(c) {
    this.tweens.add({
      targets: c.sprite,
      scale: { from: 1, to: 1.3 },
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    for (let i = 0; i < 14; i++) {
      const dot = this.add.circle(
        c.sprite.x,
        c.sprite.y - 20,
        4,
        [0xffd700, 0xf86635, 0x3fb8e8, 0x22c55e, 0xec4899][i % 5]
      );
      const angle = Phaser.Math.FloatBetween(Math.PI * 1.1, Math.PI * 1.9);
      const dist = Phaser.Math.Between(40, 90);
      this.tweens.add({
        targets: dot,
        x: dot.x + Math.cos(angle) * dist,
        y: dot.y + Math.sin(angle) * dist - 40,
        alpha: 0,
        duration: 900,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }

    this.cameras.main.shake(180, 0.004);
  }

  update(time, delta) {
    const dx = this.cloudsBgSpeed * (delta / 1000);
    this.cloudsBgA.x -= dx;
    this.cloudsBgB.x -= dx;

    if (this.cloudsBgA.x + this.cloudsBgA.displayWidth <= 0) {
      this.cloudsBgA.x = this.cloudsBgB.x + this.cloudsBgB.displayWidth;
    }
    if (this.cloudsBgB.x + this.cloudsBgB.displayWidth <= 0) {
      this.cloudsBgB.x = this.cloudsBgA.x + this.cloudsBgA.displayWidth;
    }

    this.floatingClouds.forEach((c) => {
      c.img.x += c.speed * (delta / 1000);
      if (c.img.x > this.scale.width + 100) c.img.x = -100;
    });
  }
}