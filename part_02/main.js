'use strict'
var clock = new THREE.Clock(false)
var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth/window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var G = 6.67 * Math.pow(10, -11) // 引力常量

// 向心力 GmM/r²=F=mv²/r=mw²r
// v=√(GM/r)
var balls = [
  createBall(1, 5, [0, 0, 100], [Math.sqrt(G*1e15/100), 0, 0], [0, 8e-2, 12e-2], 'bedrock'),
  createBall(1e15, 20, [0, 0, 0], [0, 0, 0], [0, 4e-2, -2e-2], 'netherrack')
]

balls.forEach(function(ball){
  scene.add(ball)
})

camera.position.set(40, 40, 240);

function update(){
  requestAnimationFrame(update);
  calc()
  renderer.render(scene, camera);
};

clock.start()
update();

var I = 0
function calc(){
  //if (I++ > 200) return

  // 根据距离质量计算受力/加速度
  //balls = shuffle(balls) // 打乱先后顺序
  balls.forEach(function(b){
    //b.v0 = b.v.clone()
    //b.a0 = b.a.clone()
    b.a.setLength(0)
    b._ = []
    b._host = {
      av: 0,
      vv: null,
      r: null,
      B: null
    }
  })
  var i, j, len = balls.length
  for (i = 0; i < len; i++) {
    var b1 = balls[i]
    for (j = i + 1; j < len; j++) {
      var b2 = balls[j]
      var d1 = b2.position.clone().sub(b1.position) // b1到b2
      var d2 = d1.clone().negate()
      var r = d1.length()
      //if (b1.id === 3) console.log(r)
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
      var av = a1.length()
      var vv = b1.v.length()
      if (av > b1._host.av) {
        b1._host.av = av
        b1._host.vv = vv
        b1._host.r = r
        b1._host.B = b2
      }
    }
  }

  var dt = clock.getDelta() // 时间差量
  //console.log(dt)
  // 设定dt最大值 解决浏览窗口 切换导致的dt暴增
  dt = Math.min(dt, 0.1)
  dt *= 55 // x快进播放

  // todo: 限制位置 不能越过其他物体
  // 根据加速度计算速度/位置
  balls.forEach(function(b){
    // 公转匹配
    var is_cen = false
    if (b._host.av / b.a.length() > 0.9) { // 大作用比
      var v2a = b.v.angleTo(b.a)
      if (Math.abs(v2a - Math.PI/2) < Math.PI/2*0.1) { // 约90°夹角
        var vv = b._host.vv
        var r = b._host.r
        var B = b._host.B
        if (Math.abs(vv - Math.sqrt(G*B.m/r)) < vv*0.1) { // 约向心力
          is_cen = true
        }
      }
    }

    // 更新速度
    var _v = b.v.clone()
    //if (b.id === 3) console.log(_v.length())
    //var _a_ = (b.a.clone().add(b.a0)).divideScalar(2)
    //b.v.add(_a_.clone().multiplyScalar(dt))
    b.v.add(b.a.clone().multiplyScalar(dt))

    if (is_cen) { // 公转 纠正线速度
      var d1 = B.position.clone().sub(b.position)
      /*var w = Math.sqrt(G*B.m/(r*r*r))
      var A = w * dt
      var xp = _v.clone().normalize().multiplyScalar(r * Math.sin(A))
        .add(
          d1.clone().normalize().multiplyScalar(r * (1 - Math.cos(A)))
          )
      b.v = xp.clone().divideScalar(dt)*/
      // 控制半径r
      // 如图 pic_02.jpg
      var s = _v.clone().multiplyScalar(dt)
      var n = d1.clone().sub(s)
      var xs = n.multiplyScalar(1 - r / n.length())
      var s1 = s.clone().add(xs)
      b.v = s1.clone().divideScalar(dt)
    }

    // 更新位置
    if (b._.length) is_cen = false
    b._.forEach(function(d){ // 碰撞 分量清零
      b.v.sub(d.clone().multiplyScalar(b.v.clone().dot(d)))
    })
    //var _v_ = (b.v.clone().add(b.v0)).divideScalar(2)
    //b.position.add(_v_.clone().multiplyScalar(dt))
    b.position.add(b.v.clone().multiplyScalar(dt))
    //console.log('ball[%d]', i, b.position)

    if (is_cen) { // 公转 复原线速度
      //console.log('is_cen')
      // 控制线速度v
      // 如图 pic_01.jpg
      var d1 = B.position.clone().sub(b.position)
      var Fv = G * b.m * B.m / (r * r)
      var F1 = d1.clone().normalize().multiplyScalar(Fv)
      var a1 = F1.clone().divideScalar(b.m)
      var v2a = a1.angleTo(_v)
      b.v = _v.clone().sub(
        a1.clone().multiplyScalar(
          _v.length()*Math.cos(v2a)/a1.length()
          )
        ).normalize().multiplyScalar(vv)
    }

    // 更新自转
    b.rotation.x += b.vr.x * dt
    b.rotation.y += b.vr.y * dt
    b.rotation.z += b.vr.z * dt
  })
}

function createBall(m, R, p, v, vr, c){
  var geometry = new THREE.SphereGeometry( R, 16, 16 );
  //var material = new THREE.MeshBasicMaterial( { color: c } );
  var material = new THREE.MeshBasicMaterial({
    map: THREE.ImageUtils.loadTexture('textures/'+ c +'.png')
  })

  var ball = new THREE.Mesh( geometry, material );
  ball.c = c
  ball.position.fromArray(p)
  ball.m = m
  ball.R = R
  ball.a = new THREE.Vector3()
  ball.v = new THREE.Vector3().fromArray(v)
  ball.vr = new THREE.Vector3().fromArray(vr)
  //ball.a0 = ball.a.clone()
  //ball.v0 = ball.v.clone()
  //ball.id = '' + Math.random()
  return ball;
}

function shuffle(arr){
  return arr.sort(function(a, b){
    return Math.random() - 0.5
  })
}
