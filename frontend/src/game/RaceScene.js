import Phaser from 'phaser';

const LANE_COLORS = [0xf86635, 0x3fb8e8, 0xa78bfa, 0x22c55e, 0xeab308, 0xec4899, 0x14b8a6, 0xf97316];

export default class RaceScene extends Phaser.Scene {
  constructor() {
    super('RaceScene');
    this.cars = {};
    this.pendingRunners = null;
    this.ready = false;
  }

  preload() {}

  create() {
    this.headerH = 60;

    this.bg = this.add.graphics();
    this.laneLines = this.add.graphics();
    this.finishFlag = this.add.graphics();
    this.carLayer = this.add.container(0, 0);

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
    this.trackH = h - this.headerH;

    this.bg.clear();
    this.bg.fillStyle(0x87ceeb, 1);
    this.bg.fillRect(0, 0, w, this.headerH);
    this.bg.fillStyle(0x2b3540, 1);
    this.bg.fillRect(0, this.headerH, w, this.trackH);

    const laneCount = Math.max(Object.keys(this.cars).length, 1);
    const laneH = this.trackH / laneCount;
    this.laneLines.clear();
    this.laneLines.lineStyle(2, 0xffffff, 0.12);
    for (let i = 1; i < laneCount; i++) {
      const y = this.headerH + i * laneH;
      for (let x = 0; x < w; x += 24) {
        this.laneLines.lineBetween(x, y, x + 12, y);
      }
    }

    this.finishFlag.clear();
    const fx = w - 26;
    const rows = Math.ceil(this.trackH / 14);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 2; c++) {
        this.finishFlag.fillStyle((r + c) % 2 === 0 ? 0x111111 : 0xffffff, 1);
        this.finishFlag.fillRect(fx + c * 8, this.headerH + r * 14, 8, 14);
      }
    }

    Object.values(this.cars).forEach((car) => this.layoutCar(car));
  }

  laneY(index, total) {
    const laneH = this.trackH / total;
    return this.headerH + laneH * index + laneH / 2;
  }

  xForProgress(progress) {
    const trackLeft = 46;
    const trackRight = this.scale.width - 46;
    return trackLeft + (Math.min(Math.max(progress, 0), 100) / 100) * (trackRight - trackLeft);
  }

  makeCar(color) {
    const container = this.add.container(0, 0);
    const shadow = this.add.ellipse(0, 20, 54, 12, 0x000000, 0.25);

    const body = this.add.graphics();
    body.fillStyle(color, 1);
    body.fillRoundedRect(-28, -14, 56, 26, 10);
    body.fillStyle(0x1a1a2e, 1);
    body.fillRoundedRect(-14, -11, 26, 12, 5);
    body.fillStyle(0xffffff, 0.8);
    body.fillRoundedRect(-12, -9, 22, 7, 3);
    body.fillStyle(0xffe066, 1);
    body.fillCircle(26, -4, 3);
    body.fillCircle(26, 8, 3);

    const wheelFront = this.add.circle(14, 13, 7, 0x111111);
    const wheelBack = this.add.circle(-16, 13, 7, 0x111111);
    const hubF = this.add.circle(14, 13, 3, 0x777777);
    const hubB = this.add.circle(-16, 13, 3, 0x777777);

    container.add([shadow, body, wheelBack, wheelFront, hubB, hubF]);
    container.wheels = [wheelBack, wheelFront];
    return container;
  }

  layoutCar(car) {
    const y = this.laneY(car.laneIndex, car.total);
    const x = this.xForProgress(car.progress);
    car.sprite.setPosition(x, y);
    car.nameTag.setPosition(x, y - 32);
    car.nameBg.setPosition(x, y - 32);
  }

  drawNameTag(car, name, reached) {
    car.nameTag.setText(name + (reached ? ' 🏆' : ''));
    const w = car.nameTag.width + 20;
    car.nameBg.clear();
    car.nameBg.fillStyle(0xffffff, 1);
    car.nameBg.lineStyle(2, reached ? 0xffd700 : car.color, 1);
    car.nameBg.fillRoundedRect(-w / 2, -10, w, 20, 10);
    car.nameBg.strokeRoundedRect(-w / 2, -10, w, 20, 10);
  }

  updateRunners(runners) {
    if (!this.ready) {
      this.pendingRunners = runners;
      return;
    }
    const total = runners.length;

    runners.forEach((r, i) => {
      let car = this.cars[r.id];
      const color = LANE_COLORS[i % LANE_COLORS.length];
      const wasReached = car?.reached;
      const reached = r.progress >= 100;

      if (!car) {
        const sprite = this.makeCar(color);
        this.carLayer.add(sprite);

        const nameBg = this.add.graphics();
        const nameTag = this.add.text(0, 0, r.nom, {
          fontFamily: 'Arial',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#1a202c',
        }).setOrigin(0.5);

        car = { sprite, nameTag, nameBg, laneIndex: i, total, progress: 0, color, reached: false };
        this.cars[r.id] = car;

        this.tweens.add({
          targets: sprite,
          y: '+=3',
          duration: 260 + i * 20,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }

      car.laneIndex = i;
      car.total = total;
      this.drawNameTag(car, r.nom, reached);

      this.trackH = this.scale.height - this.headerH;
      const y = this.laneY(i, total);
      const newX = this.xForProgress(r.progress);

      this.tweens.add({ targets: car.sprite, x: newX, y, duration: 900, ease: 'Sine.easeOut' });
      this.tweens.add({ targets: [car.nameTag, car.nameBg], x: newX, y: y - 32, duration: 900, ease: 'Sine.easeOut' });

      car.progress = r.progress;

      if (reached && !wasReached) {
        this.celebrate(car);
      }
      car.reached = reached;
    });

    this.drawScene();
  }

  celebrate(car) {
    this.tweens.add({
      targets: car.sprite,
      scale: { from: 1, to: 1.3 },
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    for (let i = 0; i < 14; i++) {
      const dot = this.add.circle(
        car.sprite.x,
        car.sprite.y - 20,
        4,
        [0xffd700, 0xf86635, 0x3fb8e8, 0x22c55e, 0xec4899][i % 5]
      );
      const angle = Phaser.Math.FloatBetween(Math.PI * 1.1, Math.PI * 1.9);
      const dist = Phaser.Math.Between(40, 90);
      this.tweens.add({
        targets: dot,
        x: dot.x + Math.cos(angle) * dist,
        y: dot.y + Math.sin(angle) * dist + 60,
        alpha: 0,
        duration: 900,
        ease: 'Cubic.easeOut',
        onComplete: () => dot.destroy(),
      });
    }

    this.cameras.main.shake(180, 0.004);
  }

  update(time, delta) {
    Object.values(this.cars).forEach((car) => {
      if (car.reached) return;
      const speed = delta * 0.01;
      car.sprite.wheels.forEach((w) => (w.rotation += speed));
    });
  }
}