// ============================================
// みかんゲーム（スイカゲーム風）
// ============================================
const { Bodies, Body, Composite, Engine, Events, Render, Runner, Sleeping } = Matter;

// ============================================
// ゲーム設定（ここを変えるとゲームの見た目や動きが変わります！）
// ============================================
const WIDTH = 440;              // ゲーム画面の横幅（変更可能）
const WORLD_WIDTH = 460;        // 物理演算の世界の横幅
const HEIGHT = 700;             // ゲーム画面の高さ（変更可能）
const WORLD_HEIGHT = 884;       // 物理演算の世界の高さ
const WALL_THICKNESS = 10;      // 壁の厚さ（変更可能）
const DEADLINE = 600;           // この高さを超えるとゲームオーバー（数値を小さくすると難しくなる）
const FRICTION = 0.3;           // フルーツの摩擦力（0～1、大きいほど止まりやすい）
const MASS = 1;                 // フルーツの重さ（変更可能）
const MAX_LEVEL = 11;           // フルーツの最大レベル（0～10で11段階）
const WALL_COLOR = "#a70";      // 壁の色（HTMLカラーコードで変更可能）

// ============================================
// 画像の設定（ここを変えると表示される画像が変わります！）
// ============================================
const USE_ANIMAL_IMAGES = false; // true: 動物画像を使う, false: 果物画像を使う

// 果物の画像パス（レベル0～10）
// 自分で画像を追加したい場合は、imagesフォルダに画像を入れてパスを変更
const FRUIT_IMAGES = {
  0: "./images/fruits/00_cherry.png",      // レベル0: さくらんぼ（一番小さい）
  1: "./images/fruits/01_strawberry.png",  // レベル1: いちご
  2: "./images/fruits/02_grape.png",       // レベル2: ぶどう
  3: "./images/fruits/03_kiwi.png",        // レベル3: キウイ
  4: "./images/fruits/04_dekopon.png",     // レベル4: デコポン
  5: "./images/fruits/05_apple.png",       // レベル5: りんご
  6: "./images/fruits/06_pear.png",        // レベル6: 梨
  7: "./images/fruits/07_peach.png",       // レベル7: 桃
  8: "./images/fruits/08_melon.png",       // レベル8: メロン
  9: "./images/fruits/09_watermelon.png",  // レベル9: すいか
  10: "./images/fruits/10_mikan.png",      // レベル10: みかん（最大！）
};

// 動物の画像パス（レベル0～10）
// USE_ANIMAL_IMAGESをtrueにすると、こっちの画像が使われます
const ANIMAL_IMAGES = {
  0: "./images/animal/00_egg.png",      // レベル0: たまご
  1: "./images/animal/01_chick.png",    // レベル1: ひよこ
  2: "./images/animal/02_chicken.png",  // レベル2: にわとり
  3: "./images/animal/03_frog.png",     // レベル3: カエル
  4: "./images/animal/04_turtle.png",   // レベル4: カメ
  5: "./images/animal/05_fugu.png",     // レベル5: フグ
  6: "./images/animal/06_rat.png",      // レベル6: ネズミ
  7: "./images/animal/07_cat.png",      // レベル7: ネコ
  8: "./images/animal/08_dog.png",      // レベル8: イヌ
  9: "./images/animal/09_monkey.png",   // レベル9: サル
  10: "./images/animal/10_human.png",   // レベル10: 人間（最大！）
};

// 実際に使用する画像を選択（動物か果物か）
const BUBBLE_IMAGES = USE_ANIMAL_IMAGES ? ANIMAL_IMAGES : FRUIT_IMAGES;

// フルーツの半径とスケールを保存する入れ物（後で自動計算されます）
const BUBBLE_RADIUS = {};  // 各レベルのフルーツの半径
const BUBBLE_SCALE = {};   // 各レベルのフルーツの拡大率

// ============================================
// 物体の分類（衝突判定に使用）
// ============================================
// これを使って「壁とフルーツ」「フルーツ同士」の当たり判定を管理します
const OBJECT_CATEGORIES = {
  WALL: 0x0001,           // 壁
  BUBBLE: 0x0002,         // 落下済みのフルーツ
  BUBBLE_PENDING: 0x0004, // まだ落としていないフルーツ（他のフルーツとぶつからない）
};

// ============================================
// ゲームのメインクラス（ゲーム全体を管理する設計図）
// ============================================
class BubbeGame {
  // ゲームで使う変数たち
  engine;                      // 物理演算エンジン
  render;                      // 画面描画
  runner;                      // ゲームループ
  currentBubble = undefined;   // 今落とそうとしているフルーツ
  score;                       // スコア
  scoreChangeCallBack;         // スコアが変わった時に呼ばれる関数
  gameover = false;            // ゲームオーバーかどうか
  defaultX = WORLD_WIDTH / 2;  // フルーツを落とすX座標（初期値は真ん中）
  message;                     // メッセージ表示エリア

  // ゲームの初期設定（ゲーム開始時に1回だけ実行される）
  constructor(container, message, scoreChangeCallBack) {
    this.message = message;
    this.scoreChangeCallBack = scoreChangeCallBack;
    
    // 物理演算エンジンを作成
    this.engine = Engine.create({
      constraintIterations: 3,  // 物理演算の精度（大きいほど正確だけど重い）
    });
    
    // 画面の描画設定
    this.render = Render.create({
      element: container,  // HTMLのどこに描画するか
      engine: this.engine,
      options: {
        width: WORLD_WIDTH,
        height: WORLD_HEIGHT,
        wireframes: false,      // falseで画像表示、trueで線だけ表示（デバッグ用）
        background: "transparent", // 背景を透明に
      },
    });
    
    // ゲームループを作成して開始
    this.runner = Runner.create();
    Render.run(this.render);
    
    // イベントリスナーを登録（マウスクリックや移動を検知）
    container.addEventListener("click", this.handleClick.bind(this));        // クリック時の処理
    container.addEventListener("mousemove", this.handleMouseMove.bind(this)); // マウス移動時の処理
    Events.on(this.engine, "collisionStart", this.handleCollision.bind(this)); // フルーツ同士がぶつかった時の処理
    Events.on(this.engine, "afterUpdate", this.checkGameOver.bind(this));     // 毎フレーム、ゲームオーバー判定
    
    // その他の初期設定
    this.dropHeight = WORLD_HEIGHT - HEIGHT;      // フルーツを落とす高さ
    this.nextBubbleLevel = this.getRandomBubbleLevel(); // 次に落とすフルーツをランダムに決定
    this.previewBubble();                         // 次のフルーツをプレビュー表示
  }

  // ============================================
  // ゲームの初期化（リセットボタンを押した時にも呼ばれる）
  // ============================================
  init() {
    // 画面上のすべてのフルーツをクリア
    Composite.clear(this.engine.world);
    this.resetMessage();
    this.gameover = false;  // ゲームオーバーフラグをリセット
    this.setScore(0);       // スコアを0に戻す

    // 地面と壁の作成（フルーツが外に出ないようにする）
    // 地面（下）
    const ground = Bodies.rectangle(
      WORLD_WIDTH / 2,                         // X座標（画面の真ん中）
      WORLD_HEIGHT - WALL_THICKNESS * 2 / 2,  // Y座標（画面の一番下）
      WIDTH,                                   // 横幅
      WALL_THICKNESS * 2,                      // 縦幅（厚さ）
      {
        isStatic: true,  // 動かない物体にする
        label: "ground", // 名前をつける
        render: {
          fillStyle: WALL_COLOR,  // 色を設定
        },
      }
    );
    
    // 左の壁
    const leftWall = Bodies.rectangle(
      (WORLD_WIDTH - WIDTH) / 2 + WALL_THICKNESS / 2,  // X座標（左端）
      WORLD_HEIGHT - HEIGHT / 2,                       // Y座標（真ん中の高さ）
      WALL_THICKNESS,                                  // 横幅（厚さ）
      HEIGHT,                                          // 縦幅（ゲーム画面の高さ）
      {
        isStatic: true,
        label: "leftWall",
        render: {
          fillStyle: WALL_COLOR,
        },
      }
    );
    
    // 右の壁
    const rightWall = Bodies.rectangle(
      (WORLD_WIDTH + WIDTH) / 2 - WALL_THICKNESS / 2,  // X座標（右端）
      WORLD_HEIGHT - HEIGHT / 2,                       // Y座標（真ん中の高さ）
      WALL_THICKNESS,                                  // 横幅（厚さ）
      HEIGHT,                                          // 縦幅（ゲーム画面の高さ）
      {
        isStatic: true,
        label: "rightWall",
        render: {
          fillStyle: WALL_COLOR,
        },
      }
    );

    // 作った地面と壁をゲーム世界に追加
    Composite.add(this.engine.world, [ground, leftWall, rightWall]);
    
    // ゲームループを開始
    Runner.run(this.runner, this.engine);
    
    // ゲーム開始前の状態に設定
    this.gameStatus = "ready";
    this.showReadyMessage();  // 「ゲーム開始」ボタンを表示
  }

  // ============================================
  // ランダムなフルーツのレベルを生成（0～4）
  // ============================================
  // 【改造ポイント】Math.random() * 5 の「5」を変えると出現するフルーツが変わるよ！
  // 例: Math.random() * 3 なら 0～2（小さいフルーツだけ）
  // 例: 4 + Math.random() * 2 なら 4～5（大きいフルーツだけ）
  getRandomBubbleLevel() {
    return Math.floor(Math.random() * 5);  // 0～4のランダムな整数を返す
  }

  // ============================================
  // 次に落とすフルーツをプレビュー表示
  // ============================================
  previewBubble() {
    const previewElement = document.querySelector(".next-bubble-preview");
    if (!previewElement) return;  // プレビュー用の要素がなければ何もしない

    // 次のフルーツの画像を背景に設定
    previewElement.style.backgroundImage = `url(${BUBBLE_IMAGES[this.nextBubbleLevel]})`;
    previewElement.style.backgroundSize = "cover";  // 画像を要素いっぱいに表示
  }

  // ============================================
  // ゲーム開始（「ゲーム開始」ボタンが押された時に呼ばれる）
  // ============================================
  start(e) {
    e.preventDefault();   // デフォルトの動作をキャンセル
    e.stopPropagation();  // イベントの伝播を止める
    if (this.gameStatus === "ready") {
      this.gameStatus = "canput";  // フルーツを置ける状態に変更
      this.createNewBubble();      // 最初のフルーツを作成
      this.resetMessage();         // メッセージを非表示に
    }
  }

  // ============================================
  // 新しいフルーツを作成して画面上部に配置
  // ============================================
  createNewBubble() {
    if (this.gameover) return;  // ゲームオーバーなら何もしない

    // 現在のフルーツレベルを決定し、次のフルーツを準備
    const level = this.nextBubbleLevel;
    this.nextBubbleLevel = this.getRandomBubbleLevel();  // 次のフルーツをランダムに決定
    this.previewBubble();                                // プレビューを更新

    // フルーツの見た目を設定
    const radius = BUBBLE_RADIUS[level];   // 半径（大きさ）
    const texture = BUBBLE_IMAGES[level];  // 画像
    const scale = BUBBLE_SCALE[level];     // 拡大率

    // 円形のフルーツオブジェクトを作成
    const currentBubble = Bodies.circle(
      this.defaultX,         // X座標（落とす位置）
      this.dropHeight + 30,  // Y座標（画面上部）
      radius,                // 半径
      {
        isSleeping: true,  // 最初は静止状態（クリックで落ちる）
        label: "bubble_" + level,  // 名前（レベルを含む）
        sleepThreshold: 60,        // 静止判定の閾値
        restitution: 0.3,          // 反発係数（バウンドの強さ、0～1）
        friction: FRICTION,        // 摩擦係数
        mass: MASS,                // 質量
        collisionFilter: {
          group: 0,
          category: OBJECT_CATEGORIES.BUBBLE_PENDING,  // まだ落としていない状態
          mask: OBJECT_CATEGORIES.WALL | OBJECT_CATEGORIES.BUBBLE,  // 壁とだけ衝突する
        },
        render: {
          sprite: {
            texture: texture,  // 表示する画像
          },
          lineWidth: 1,
        },
      }
    );
    this.currentBubble = currentBubble;  // 現在のフルーツとして保存
    Composite.add(this.engine.world, [currentBubble]);  // ゲーム世界に追加
  }

  // ============================================
  // フルーツを落とす（クリックされた時に呼ばれる）
  // ============================================
  putCurrentBubble() {
    if (this.currentBubble) {
      Sleeping.set(this.currentBubble, false);  // 静止状態を解除（落下開始）
      this.currentBubble.collisionFilter.category = OBJECT_CATEGORIES.BUBBLE;  // 他のフルーツと衝突するように変更
      this.currentBubble = undefined;  // 現在のフルーツをクリア
    }
  }

  // ============================================
  // ゲームオーバー判定（毎フレーム実行される）
  // ============================================
  checkGameOver() {
    // 画面上のすべてのフルーツを取得
    const bubbles = Composite.allBodies(this.engine.world).filter((body) =>
      body.label.startsWith("bubble_")  // "bubble_"で始まる名前のものだけ
    );
    
    // 各フルーツをチェック
    for (const bubble of bubbles) {
      // フルーツが一定の高さより上にあり、かつ上向きに動いている場合
      if (bubble.position.y < WORLD_HEIGHT - DEADLINE && bubble.velocity.y < 0) {
        Runner.stop(this.runner);     // ゲームを停止
        this.gameover = true;         // ゲームオーバーフラグを立てる
        this.showGameOverMessage();   // ゲームオーバー画面を表示
        break;  // ループを抜ける
      }
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

  // メッセージを非表示にする
  resetMessage() {
    this.message.replaceChildren();         // 中身を空にする
    this.message.style.display = "none";   // 非表示にする
  }

  // ============================================
  // クリック時の処理（フルーツを落とす）
  // ============================================
  handleClick() {
    if (this.gameover) return;  // ゲームオーバーなら何もしない
    
    if (this.gameStatus === "canput") {
      this.putCurrentBubble();      // フルーツを落とす
      this.gameStatus = "interval";  // 連打防止のため一時的に置けない状態に
      
      // 0.5秒後に次のフルーツを作成
      // 【改造ポイント】500を変えると次のフルーツが出るまでの時間が変わるよ！（ミリ秒）
      setTimeout(() => {
        this.createNewBubble();
        this.gameStatus = "canput";  // 再び置ける状態に
      }, 500);
    }
  }

  // ============================================
  // フルーツ同士が衝突した時の処理（合体処理）
  // ============================================
  handleCollision({ pairs }) {
    // すべての衝突ペアをチェック
    for (const pair of pairs) {
      const { bodyA, bodyB } = pair;  // 衝突した2つの物体
      
      // すでに消滅済みのフルーツなら無視
      if (
        !Composite.get(this.engine.world, bodyA.id, "body") ||
        !Composite.get(this.engine.world, bodyB.id, "body")
      ) {
        continue;
      }
      
      // 同じレベルのフルーツ同士がぶつかった場合
      if (bodyA.label === bodyB.label && bodyA.label.startsWith("bubble_")) {
        const currentBubbleLevel = Number(bodyA.label.substring(7));  // レベルを取得
        
        // スコア加算（2のレベル乗）
        // 【改造ポイント】2 ** currentBubbleLevel を変えるとスコアの増え方が変わるよ！
        this.setScore(this.score + 2 ** currentBubbleLevel);
        
        // 最大レベル（11）の場合は合体せずに消滅
        if (currentBubbleLevel === 11) {
          Composite.remove(this.engine.world, [bodyA, bodyB]);
          continue;
        }
        
        // 1つ上のレベルのフルーツを作成
        const newLevel = currentBubbleLevel + 1;
        const newX = (bodyA.position.x + bodyB.position.x) / 2;  // 2つのフルーツの真ん中のX座標
        const newY = (bodyA.position.y + bodyB.position.y) / 2;  // 2つのフルーツの真ん中のY座標
        const newRadius = BUBBLE_RADIUS[newLevel];               // 新しいフルーツの半径
        
        // 新しいフルーツを作成
        const newBubble = Bodies.circle(newX, newY, newRadius, {
          label: "bubble_" + newLevel,
          friction: FRICTION,
          mass: MASS,
          collisionFilter: {
            group: 0,
            category: OBJECT_CATEGORIES.BUBBLE,  // 他のフルーツと衝突する
            mask: OBJECT_CATEGORIES.WALL | OBJECT_CATEGORIES.BUBBLE,
          },
          render: {
            sprite: {
              texture: BUBBLE_IMAGES[newLevel],  // 新しいレベルの画像
            },
            lineWidth: 1,
          },
        });
        
        // 古い2つのフルーツを削除し、新しいフルーツを追加
        Composite.remove(this.engine.world, [bodyA, bodyB]);
        Composite.add(this.engine.world, [newBubble]);
      }
    }
  }

  // ============================================
  // マウス移動時の処理（フルーツの位置を変える）
  // ============================================
  handleMouseMove(e) {
    // フルーツを置けない状態 or フルーツがない場合は何もしない
    if (this.gameStatus !== "canput" || !this.currentBubble) {
      return;
    }
    
    const { offsetX } = e;  // マウスのX座標を取得
    const currentBubbleRadius =
      Number(this.currentBubble.label.substring(7)) * 10 + 20;  // フルーツの半径を計算
    
    // フルーツが壁からはみ出ないように制限
    const newX = Math.max(
      Math.min(offsetX, WORLD_WIDTH - 15 - currentBubbleRadius),  // 右の壁
      15 + currentBubbleRadius  // 左の壁
    );
    
    // フルーツの位置を更新（X座標のみ）
    Body.setPosition(this.currentBubble, {
      x: newX,
      y: this.currentBubble.position.y,
    });
    this.defaultX = newX;  // 次のフルーツもこの位置に出現するように記憶
  }

  // スコアを設定（スコアが変わった時に呼ばれる）
  setScore(score) {
    this.score = score;
    if (this.scoreChangeCallBack) {
      this.scoreChangeCallBack(score);  // スコア表示を更新する関数を呼ぶ
    }
  }
}

// ============================================
// ページが読み込まれた時に実行される処理
// ============================================
window.onload = () => {
  // HTML要素を取得
  const container = document.querySelector(".container");  // ゲーム画面
  const message = document.querySelector(".message");      // メッセージ表示エリア
  
  // スコアが変わった時の処理
  const onChangeScore = (val) => {
    const score = document.querySelector(".score");  // スコア表示要素を取得
    score.replaceChildren(`${val}`);                // スコアを更新
  };

  // ゲームを作成して初期化
  const game = new BubbeGame(container, message, onChangeScore);
  game.init();  // ゲームを初期化（壁や地面を作る）
};

// ============================================
// 画像の事前読み込み（プリロード）
// ============================================
// すべてのフルーツ画像を読み込んで、サイズを計算しておく
for (let i = 0; i <= MAX_LEVEL; i++) {
  const image = new Image();  // 新しい画像オブジェクトを作成
  
  // 画像が読み込まれた時の処理
  image.onload = () => {
    BUBBLE_RADIUS[i] = image.naturalWidth / 2;  // 画像の幅から半径を計算
    BUBBLE_SCALE[i] = (BUBBLE_RADIUS[i] * 2) / image.naturalWidth;  // 拡大率を計算
  };
  
  image.src = BUBBLE_IMAGES[i];  // 画像の読み込みを開始
}
