const canvas = document.querySelector('canvas')
const ctx = canvas.getContext('2d')

const scoreH1 = document.querySelector('h1')
const scoreEl = document.querySelector('#scoreEl')
const startGameBtn = document.querySelector('#startGameBtn')
const modalEl = document.querySelector('#modalEl')
const changelogEl = document.querySelector('#changelog')
const changelogListEl = document.querySelector('#changelogList')

document.body.oncontextmenu = () => { return !1 }

canvas.height = window.innerHeight
canvas.width = window.innerWidth
ctx.translate(canvas.width / 2, canvas.height / 2)

class Entity {
  constructor(x, y, radius, color) {
    this.x = x
    this.y = y
    this.radius = radius
    this.color = color
  }

  draw() {
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false)
    ctx.fillStyle = this.color
    ctx.fill()
  }
}

class MovingEntity extends Entity {
  constructor(x, y, radius, color, angle, speed) {
    super(x, y, radius, color)
    this.angle = angle
    this.speed = speed
  }

  update() {
    this.x += Math.cos(this.angle) * this.speed * globalSpeed
    this.y += Math.sin(this.angle) * this.speed * globalSpeed
  }
}

class Vector {
  constructor(x, y) {
    this.x = x
    this.y = y
  }

  mult(x) {
    this.x *= x
    this.y *= x
  }

  normalize() {
    const len = this.length()
    if (len == 0) return
    this.x /= len
    this.y /= len
  }

  angle() {
    return Math.atan2(this.y, this.x)
  }

  length() {
    return (this.x ** 2 + this.y ** 2) ** (1 / 2)
  }
}

let reload = 0
let globalSpeed = 1
const player = new MovingEntity(0, 0, 15, "white", 0, 5)
const projectiles = []
const enemies = []
const enemySpawnTimer = 500
const enemySpeed = 75
const keyboard = new Set()
let score = 0

function spawnEnemy() {
  return setInterval(() => {
    const radius = Math.random() * (30 - 10 - globalSpeed) + 10 + globalSpeed
    let x = Math.random() < 0.5 ? -ctx.getTransform().e - radius : ctx.getTransform().e + radius
    let y = Math.random() < 0.5 ? -ctx.getTransform().f - radius : ctx.getTransform().f + radius
    if (Math.random() < 0.5) {
      y = Math.random() * canvas.height - ctx.getTransform().f
    } else {
      x = Math.random() * canvas.width - ctx.getTransform().e
    }
    const color = `hsl(${Math.random() * 360}, 50%, 50%)`

    const angle = Math.atan2(-y + player.y, -x + player.x)

    enemies.push(new MovingEntity(x, y, radius, color, angle, enemySpeed / radius))
  }, enemySpawnTimer)
}

let mouse = { x: null, y: null }
window.addEventListener('mousedown', () => { keyboard.add('mouse') })
window.addEventListener('mousemove', event => { mouse = { x: event.clientX, y: event.clientY } })
window.addEventListener('mouseleave', () => { keyboard.delete('mouse') })
window.addEventListener('mouseup', () => { keyboard.delete('mouse') })
window.addEventListener('mouseout', () => { keyboard.delete('mouse') })
window.addEventListener('click', event => {
  const angle = Math.atan2(-player.y + event.clientY - ctx.getTransform().f, -player.x + event.clientX - ctx.getTransform().e)
  projectiles.push(new MovingEntity(player.x, player.y, 5, "white", angle, 8))
})

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  reload = Math.max(0, reload - 0.1 * globalSpeed)
  if (keyboard.has('mouse') && reload == 0) {
    const angle = Math.atan2(-player.y + mouse.y - ctx.getTransform().f, -player.x + mouse.x - ctx.getTransform().e)
    projectiles.push(new MovingEntity(player.x, player.y, 5, "white", angle, 8))
    reload = 0.5
  }

  scoreEl.innerHTML = score
  scoreH1.innerHTML = score
  globalSpeed *= 1.001
  clear()

  const target = new Vector(0, 0)
  if (keyboard.has(65) ^ keyboard.has(68)) {
    if (keyboard.has(65)) {
      target.x -= 1
    } else {
      target.x += 1
    }
  }

  if (keyboard.has(83) ^ keyboard.has(87)) {
    if (keyboard.has(87)) {
      target.y -= 1
    } else {
      target.y += 1
    }
  }

  target.normalize()
  if (target.length() != 0) {
    target.mult(player.speed)
    player.angle = target.angle()
    player.update()
  }
  player.draw()

  projectiles.forEach((projectile, projectileIndex) => {
    projectile.update()

    if (
      projectile.x + projectile.radius < - ctx.getTransform().e ||
      projectile.x - projectile.radius > ctx.getTransform().e ||
      projectile.y + projectile.radius < - ctx.getTransform().f ||
      projectile.y - projectile.radius > ctx.getTransform().f
    ) {
      setTimeout(() => {
        projectiles.splice(projectileIndex, 1)
      }, 0)
    }
    projectile.draw()
  })

  if (
    player.x + player.radius + 1 < - ctx.getTransform().e ||
    player.x - player.radius - 1 > ctx.getTransform().e ||
    player.y + player.radius + 1 < - ctx.getTransform().f ||
    player.y - player.radius - 1 > ctx.getTransform().f
  ) {
    cancelAnimationFrame(animationId)
    modalEl.style.display = 'flex'
  }

  enemies.forEach((enemy, enemyIndex) => {
    enemy.update()

    const distanceEnemyPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y)
    if (distanceEnemyPlayer - enemy.radius - player.radius < 1 && enemy.radius != 0) {
      cancelAnimationFrame(animationId)
      modalEl.style.display = 'flex'
    }

    projectiles.forEach((projectile, projectileIndex) => {
      const distanceEnemyProjectile = Math.hypot(projectile.x - enemy.x, projectile.y - enemy.y)

      if (distanceEnemyProjectile - enemy.radius - projectile.radius < 1 && enemy.radius != 0) {
        score += 10
        if (enemy.radius - 10 > 5) {
          gsap.to(enemy, { radius: enemy.radius - 10, speed: enemySpeed / (enemy.radius - 10) })
          setTimeout(() => {
            projectiles.splice(projectileIndex, 1)
          }, 0)
        } else {
          enemy.radius = 0
          setTimeout(() => {
            projectiles.splice(projectileIndex, 1)
          }, 0)
        }
      }
    })

    if (enemy.radius == 0) {
      setTimeout(() => {
        enemies.splice(enemyIndex, 1)
      }, 0)
    }

    const angle = Math.atan2(-enemy.y + player.y, -enemy.x + player.x)
    if (angle < -Math.PI / 2 && enemy.angle > Math.PI / 2) enemy.angle -= Math.PI * 2
    if (angle > Math.PI / 2 && enemy.angle < -Math.PI / 2) enemy.angle += Math.PI * 2
    const correction = enemy.radius < 10 ? 0.001 : 0.005
    if (enemy.angle < angle) {
      enemy.angle += correction * enemy.speed
    } else if (enemy.angle > angle) {
      enemy.angle -= correction * enemy.speed
    }
    if (
      enemy.x + enemy.radius + 1 < - ctx.getTransform().e ||
      enemy.x - enemy.radius - 1 > ctx.getTransform().e ||
      enemy.y + enemy.radius + 1 < - ctx.getTransform().f ||
      enemy.y - enemy.radius - 1 > ctx.getTransform().f
    ) {
      setTimeout(() => {
        enemies.splice(enemyIndex, 1)
      }, 0)
    }

    enemy.draw()
  })
}

function clear() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  ctx.fillRect(-ctx.getTransform().e, -ctx.getTransform().f, canvas.width, canvas.height)
}

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  ctx.translate(canvas.width / 2, canvas.height / 2)
})

window.addEventListener('keydown', event => { keyboard.add(event.keyCode) })
window.addEventListener('keyup', event => { keyboard.delete(event.keyCode) })

let i1
let i2
startGameBtn.addEventListener('click', () => {
  if (i1) {
    clearInterval(i1)
    clearInterval(i2)
  }

  globalSpeed = 1
  reload = 0
  score = 0
  player.x = 0
  player.y = 0
  while (enemies.length) enemies.pop()
  while (projectiles.length) projectiles.pop()
  animate()
  i1 = spawnEnemy()
  i2 = spawnEnemy()
  modalEl.style.display = 'none'
})

changelogEl.addEventListener('click', () => {
  changelogListEl.style.display = 'flex'
  modalEl.style.display = 'none'
})

changelogListEl.addEventListener('click', () => {
  changelogListEl.style.display = 'none'
  modalEl.style.display = 'flex'
})