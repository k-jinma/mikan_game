const { Bodies, Body, Composite, Engine, Events, Render, Runner, Sleeping } =
  Matter;


const WIDTH = 440; // 横幅
const WORLD_WIDTH = 460;
const HEIGHT = 700; // 高さ
const WORLD_HEIGHT = 884;
const WALL_T = 10; // 壁の厚さ
const DEADLINE = 600; // ゲームオーバーになる高さ
const FRICTION = 0.3; // 摩擦
const MASS = 1; // 重量
const MAX_LEVEL = 11;
const WALL_COLOR = "#a70";

// 画像を果物から動物に変更
const animal_flg = false

if (animal_flg == false){
  IMAGES_dir = {
    //画像のパス
    0: "./images/fruits/00_cherry.png",
    1: "./images/fruits/01_strawberry.png",
    2: "./images/fruits/02_grape.png",
    3: "./images/fruits/03_kiwi.png",
    4: "./images/fruits/04_dekopon.png",
    5: "./images/fruits/05_apple.png",
    6: "./images/fruits/06_pear.png",
    7: "./images/fruits/07_peach.png",
    8: "./images/fruits/08_melon.png",
    9: "./images/fruits/09_watermelon.png",
    10: "./images/fruits/10_mikan.png",
  };
}else{
  IMAGES_dir = {
    //画像のパス
    0: "./images/animal/00_egg.png",
    1: "./images/animal/01_chick.png",
    2: "./images/animal/02_chicken.png",
    3: "./images/animal/03_frog.png",
    4: "./images/animal/04_turtle.png",
    5: "./images/animal/05_fugu.png",
    6: "./images/animal/06_rat.png",
    7: "./images/animal/07_cat.png",
    8: "./images/animal/08_dog.png",
    9: "./images/animal/09_monkey.png",
    10: "./images/animal/10_human.png",
  };
}
const BUBBLE_IMAGES = IMAGES_dir;

const BUBBLE_RADIUS = {
}; //画像毎の半径

// 画像スケール比を格納するオブジェクト
const BUBBLE_SCALE = {};

// 画像をプリロードしてスケール比を計算
for (let i = 0; i < Object.keys(BUBBLE_IMAGES).length; i++) {
  const image = new Image();
  image.src = BUBBLE_IMAGES[i];
  image.onload = () => {
    // 画像がロードされたら、バブルの半径と比較してスケール比を計算
    const scale = (BUBBLE_RADIUS[i] * 2) / image.naturalWidth;
    BUBBLE_SCALE[i] = scale;
  };
}



const OBJECT_CATEGORIES = {
  WALL: 0x0001,
  BUBBLE: 0x0002,
  BUBBLE_PENDING: 0x0004,
};

class BubbeGame {
  engine;
  render;
  runner;
  currentBubble = undefined;
  score;
  scoreChangeCallBack;
  gameover = false;
  defaultX = WORLD_WIDTH / 2;
  message;

  constructor(container, message, scoreChangeCallBack) {
    this.message = message;
    this.scoreChangeCallBack = scoreChangeCallBack;
    this.engine = Engine.create({
      constraintIterations: 3,
    });
    this.render = Render.create({
      element: container,
      engine: this.engine,
      options: {
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        wireframes: false,
        background: 'transparent' // 背景を透明に設定
      },
    });
    this.runner = Runner.create();
    Render.run(this.render);
    container.addEventListener("click", this.handleClick.bind(this));
    container.addEventListener("mousemove", this.handleMouseMove.bind(this));
    Events.on(this.engine, "collisionStart", this.handleCollision.bind(this));
    Events.on(this.engine, "afterUpdate", this.checkGameOver.bind(this));
    this.dropHeight = WORLD_HEIGHT-HEIGHT; // バブルを落とすY座標の固定値
    this.nextBubbleLevel = this.getRandomBubbleLevel(); // 次のバブルレベルをランダムに設定
    this.previewBubble(); // 次のバブルのプレビューを表示    
  }


  init() {
    // リセット時も使うので一旦全部消す
    Composite.clear(this.engine.world);
    this.resetMessage();

    // 状態初期化
    this.gameover = false;
    this.setScore(0);

    // 地面と壁作成
    // 矩形の場合X座標、Y座標、横幅、高さの順に指定、最後にオプションを設定できる
    const ground = Bodies.rectangle(
      WORLD_WIDTH / 2,
      WORLD_HEIGHT - WALL_T*2 / 2,
      WIDTH,
      WALL_T*2,
      {
        isStatic: true,
        label: "ground",
        render: {
          fillStyle: WALL_COLOR,
        },
      }
    );
    const leftWall = Bodies.rectangle((WORLD_WIDTH-WIDTH)/2+WALL_T / 2, WORLD_HEIGHT-HEIGHT / 2, WALL_T, HEIGHT, {
      isStatic: true,
      label: "leftWall",
      render: {
        fillStyle: WALL_COLOR,
      },
    });
    const rightWall = Bodies.rectangle(
      (WORLD_WIDTH+WIDTH)/2 - WALL_T / 2,
      WORLD_HEIGHT-HEIGHT / 2,
      WALL_T,
      HEIGHT,
      {
        isStatic: true,
        label: "rightWall",
        render: {
          fillStyle: WALL_COLOR,
        },
      }
    );
    // 地面と壁を描画
    Composite.add(this.engine.world, [ground, leftWall, rightWall]);
    Runner.run(this.runner, this.engine);

    // ステータスをゲーム準備完了に
    this.gameStatus = "ready";
    this.showReadyMessage();
  }

  // 次のフルーツのレベルをランダムに選択するメソッド
  getRandomBubbleLevel() {
    return Math.floor(Math.random() * 5); // 0から4までのランダムな数値
    // 4か5しか返さないようにする
    //return 4+Math.floor(Math.random() * 2); // 4または5をランダムに生成
  }

  // 次のバブルのプレビューを表示するメソッド
  previewBubble() {
    const previewElement = document.querySelector('.next-bubble-preview');
    if (!previewElement) return; // プレビュー要素がなければ何もしない

    // 次のバブルの画像パスを取得し、プレビュー要素の背景に設定
    previewElement.style.backgroundImage = `url(${BUBBLE_IMAGES[this.nextBubbleLevel]})`;
    previewElement.style.backgroundSize = 'cover'; // 画像を要素に合わせて調整
  }

  start(e) {
    e.preventDefault();
    e.stopPropagation();
    if (this.gameStatus === "ready") {
      this.gameStatus = "canput";
      this.createNewBubble();
      this.resetMessage();
    }
  }

  createNewBubble() {
    if (this.gameover) {
      return;
    }
    // バブルの大きさをランダムに決定

    // 次のバブルを現在のバブルに設定し、新しい次のバブルを準備
    const level = this.nextBubbleLevel;
    this.nextBubbleLevel = this.getRandomBubbleLevel(); // 新しい次のバブルのレベルをランダムに設定
    this.previewBubble(); // 次のバブルのプレビューを更新
    //const level = Math.floor(Math.random() * 5);
    // const radius = level * 10 + 20;
    //const radius = BUBBLE_RADIUS[level];
    const radius = BUBBLE_RADIUS[level];

    const texture = BUBBLE_IMAGES[level];

    // 画像の読み込みを開始
    const image = new Image();
    image.src = texture;
    const scale = BUBBLE_SCALE[level]; // 予め計算されたスケール比を取得
    
    // 描画位置のX座標、y座標、円の半径を渡す
    const currentBubble = Bodies.circle(this.defaultX, this.dropHeight+30, radius, {
      isSleeping: true,
      label: "bubble_" + level,
      sleepThreshold: 60, // 休眠になるまでの閾値を60に設定
      restitution: 0.3, //反発係数
      friction: FRICTION,
      mass: MASS,
      collisionFilter: {
        group: 0,
        category: OBJECT_CATEGORIES.BUBBLE_PENDING, // まだ落下位置の決定前なのですでにあるバブルと衝突しないようにする
        mask: OBJECT_CATEGORIES.WALL | OBJECT_CATEGORIES.BUBBLE,
      },
      render: {
        sprite: {
          texture: texture,
          // xScale: scale, // 横方向のスケールを設定
          // yScale: scale, // 縦方向のスケールを設定
        },
        lineWidth: 1,
      },
    });
    this.currentBubble = currentBubble;
    Composite.add(this.engine.world, [currentBubble]);
  }

  putCurrentBubble() {
    if (this.currentBubble) {
      Sleeping.set(this.currentBubble, false);
      this.currentBubble.collisionFilter.category = OBJECT_CATEGORIES.BUBBLE;
      this.currentBubble = undefined;
    }
  }

  // ゲームオーバー判定
  // 一定以上の高さに上方向の速度を持つオブジェクトが存在している場合ゲームオーバーとする
  checkGameOver() {
    const bubbles = Composite.allBodies(this.engine.world).filter((body) =>
      body.label.startsWith("bubble_")
    );
    for (const bubble of bubbles) {
      if (bubble.position.y < WORLD_HEIGHT - DEADLINE && bubble.velocity.y < 0) {
        Runner.stop(this.runner);
        this.gameover = true;
        this.showGameOverMessage();
        break;
      }
      // ここで抜けるとゲームオーバーしなくなる
      
      // break;
    }
  }

  showReadyMessage() {
    const p = document.createElement("p");
    p.classList.add("mainText");
    p.textContent = "みかんゲーム";
    const p2 = document.createElement("p");
    p2.classList.add("subText");
    p2.textContent = "フルーツを大きくしよう";
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.classList.add("button");
    button.addEventListener("click", this.start.bind(this));
    button.innerText = "ゲーム開始";
    this.message.appendChild(p);
    this.message.appendChild(p2);
    this.message.appendChild(button);
    this.message.style.display = "block";
  }

  showGameOverMessage() {
    const p = document.createElement("p");
    p.classList.add("mainText");
    p.textContent = "Game Over";
    const p2 = document.createElement("p");
    p2.classList.add("subText");
    p2.textContent = `Score: ${this.score}`;
    const button = document.createElement("button");
    button.setAttribute("type", "button");
    button.classList.add("button");
    button.addEventListener("click", this.init.bind(this));
    button.innerText = "もう一度";
    this.message.appendChild(p);
    this.message.appendChild(p2);
    this.message.appendChild(button);
    this.message.style.display = "block";
  }

  resetMessage() {
    this.message.replaceChildren();
    this.message.style.display = "none";
  }

  handleClick() {
    if (this.gameover) {
      return;
    }
    if (this.gameStatus === "canput") {
      this.putCurrentBubble();
      this.gameStatus = "interval";
      setTimeout(() => {
        this.createNewBubble();
        this.gameStatus = "canput";
      }, 500);
    }
  }

  handleCollision({ pairs }) {
    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;
      // 既に衝突して消滅済みのバブルについての判定だった場合スキップ
      if (
        !Composite.get(this.engine.world, bodyA.id, "body") ||
        !Composite.get(this.engine.world, bodyB.id, "body")
      ) {
        continue;
      }
      if (bodyA.label === bodyB.label && bodyA.label.startsWith("bubble_")) {
        const currentBubbleLevel = Number(bodyA.label.substring(7));
        // スコア加算
        this.setScore(this.score + 2 ** currentBubbleLevel);
        if (currentBubbleLevel === 11) {
          // 最大サイズの場合新たなバブルは生まれない
          Composite.remove(this.engine.world, [bodyA, bodyB]);
          continue;
        }
        const newLevel = currentBubbleLevel + 1;
        const newX = (bodyA.position.x + bodyB.position.x) / 2;
        const newY = (bodyA.position.y + bodyB.position.y) / 2;
        const newRadius = BUBBLE_RADIUS[newLevel];
        const newBubble = Bodies.circle(newX, newY, newRadius, {
          label: "bubble_" + newLevel,
          friction: FRICTION,
          mass: MASS,
          collisionFilter: {
            group: 0,
            category: OBJECT_CATEGORIES.BUBBLE,
            mask: OBJECT_CATEGORIES.WALL | OBJECT_CATEGORIES.BUBBLE,
          },
          render: {
            sprite: {
              texture: BUBBLE_IMAGES[newLevel],
              // xScale: BUBBLE_SCALE[newLevel],
              // yScale: BUBBLE_SCALE[newLevel],
              },
            lineWidth: 1,
          },
        });
        Composite.remove(this.engine.world, [bodyA, bodyB]);
        Composite.add(this.engine.world, [newBubble]);
      }
    }
  }

  // 落とすフルーツのX位置を移動する
  handleMouseMove(e) {
    if (this.gameStatus !== "canput" || !this.currentBubble) {
      return;
    }
    const { offsetX } = e;
    const currentBubbleRadius =
      Number(this.currentBubble.label.substring(7)) * 10 + 20;
    const newX = Math.max(
      Math.min(offsetX, WORLD_WIDTH - 15 - currentBubbleRadius),
      15 + currentBubbleRadius
    );
    Body.setPosition(this.currentBubble, {
      x: newX,
      y: this.currentBubble.position.y,
    });
    this.defaultX = newX;
  }

  setScore(score) {
    this.score = score;
    if (this.scoreChangeCallBack) {
      this.scoreChangeCallBack(score);
    }
  }
}

window.onload = () => {
  const container = document.querySelector(".container");
  const message = document.querySelector(".message");
  const onChangeScore = (val) => {
    const score = document.querySelector(".score");
    //score.replaceChildren(`Score: ${val}`);
    score.replaceChildren(`${val}`);
  };

  // とりあえずゲーム作成
  const game = new BubbeGame(container, message, onChangeScore);
  // とりあえず初期化する
  game.init();
};

//画像の幅取得のための初期処理
const images = [];

for (let i = 0; i < 11; i++) {
  const image = new Image();

  image.onload = () => {
    // 画像がロードされた後に実行される処理
    BUBBLE_RADIUS[i] = image.naturalWidth / 2;
  };

  // 画像の読み込みを開始
  image.src = BUBBLE_IMAGES[i];

  images.push(image);
}
