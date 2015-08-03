
var clock = new THREE.Clock(false)
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var G = 6.67 * Math.pow(10, -11) // 引力常量
//var _R = Math.pow(10, 3) // 距离级数
// 取消距离系数 即系数恒为1
var _M = Math.pow(10, 11) // 质量级数

var balls = [
  createBall(1, 2, [-5, 0, 0], [0, 0, 0], 0x00ff00),
  createBall(2, 1.5, [0, -5, 0], [0, 0, 0], 0xff0000),
  createBall(1, 1, [0, 0, -5], [0, 0, 1], 0x0000ff),
  createBall(1, 1, [5, 5, 0], [0, -2.4, 0], 0xff00ff)
]

balls.forEach(function(ball){
  scene.add(ball)
})

camera.position.y = 7;
camera.position.z = 30;

var update = function () {
  requestAnimationFrame(update);
  calc()
  renderer.render(scene, camera);
};

clock.start()
update();


function calc(dt){
  var dt = clock.getDelta() // 时间差量
  // 设定dt最大值 解决浏览窗口切换导致的dt暴增
  dt = Math.min(dt, 0.06)
  // 根据距离质量计算受力/加速度
  //balls = shuffle(balls) // 打乱先后顺序
  balls.forEach(function(b){
    //b.a0 = b.a.clone()
    b.a.setLength(0)
    b._.length = 0
  })
  var i, j, len = balls.length
  for (i = 0; i < len; i++) {
    var b1 = balls[i]
    for (j = i + 1; j < len; j++) {
      var b2 = balls[j]
      var d1 = b2.position.clone().sub(b1.position) // b1到b2
      var d2 = d1.clone().negate()
      var r = d1.length()
      if (r <= b1.R + b2.R) { // 碰撞 标记分量
        b1._.push(d1.clone().normalize())
        b2._.push(d2.clone().normalize())
      }
      var Fv = G * b1.m * b2.m / (r * r)
      var F1 = d1.clone().normalize().multiplyScalar(Fv)
      var F2 = F1.clone().negate()
      var a1 = F1.clone().divideScalar(b1.m)
      var a2 = F2.clone().divideScalar(b2.m)
      b1.a.add(a1)
      b2.a.add(a2)
    }
  }
  // 根据加速度计算速度/位置
  balls.forEach(function(b){
    //var _a_ = (b.a.clone().add(b.a0)).divideScalar(2)
    //b.v.add(_a_.clone().multiplyScalar(dt))
    b.v.add(b.a.clone().multiplyScalar(dt))
    b._.forEach(function(d){ // 碰撞 分量清零
      b.v.sub(d.clone().multiplyScalar(b.v.clone().dot(d)))
    })
    //var _v_ = (b.v.clone().add(b.v0)).divideScalar(2)
    //b.position.add(_v_.clone().multiplyScalar(dt))
    b.position.add(b.v.clone().multiplyScalar(dt))
    //b._v = b.v.clone()
    //console.log('ball[%d]', i, b.position)
  })
}

function createBall(m, R, p, v, c){
  var geometry = new THREE.SphereGeometry( R, 16, 16 );
  var material = new THREE.MeshBasicMaterial( { color: c } );
  var ball = new THREE.Mesh( geometry, material );
  ball.position.fromArray(p)
  ball.m = _M * m
  ball.R = R
  ball.a = new THREE.Vector3()
  ball.v = new THREE.Vector3().fromArray(v)
  //ball.a0 = ball.a.clone()
  //ball.v0 = ball.v.clone()
  ball._ = []
  ball.id = '' + Math.random()
  return ball;
}

function shuffle(arr){
  return arr.sort(function(a, b){
    return Math.random() - 0.5
  })
}
