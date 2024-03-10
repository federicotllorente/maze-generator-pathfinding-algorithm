const LOOP_INTERVAL = 300

const GRID_COLS = 20
const GRID_ROWS = GRID_COLS

const CELL_SIZE = window.innerHeight < window.innerWidth
  ? (window.innerHeight - 16) / GRID_ROWS
  : (window.innerWidth - 16) / GRID_COLS

let grid = []
const stack = []
const visitedCells = []
const unvisitedCells = []
let int, canvas, current

function drawLine(startX, startY, endX, endY) {
  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = 'rgb(255, 255, 255)'
  ctx.lineWidth = 1

  ctx.beginPath()
  ctx.moveTo(startX, startY)
  ctx.lineTo(endX, endY)
  ctx.stroke()
}

function removeWalls(a, b) {
  const x = a.x - b.x

  if (x === 1) {
    // LEFT NEIGHBOR
    a.walls.left = false
    b.walls.right = false
    return
  }

  if (x === -1) {
    // RIGHT NEIGHBOR
    a.walls.right = false
    b.walls.left = false
    return
  }

  const y = a.y - b.y

  if (y === 1) {
    // TOP NEIGHBOR
    a.walls.top = false
    b.walls.bottom = false
    return
  }

  if (y === -1) {
    // BOTTOM NEIGHBOR
    a.walls.bottom = false
    b.walls.top = false
    return
  }
}

class Cell {
  constructor(x, y) {
    // Location
    this.x = x
    this.y = y

    this.walls = {
      top: true,
      right: true,
      bottom: true,
      left: true
    }

    this.wasVisited = false

    this.highlight = function() {
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = 'rgb(100, 155, 100)'
      ctx.fillRect(this.x * CELL_SIZE, this.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
    }

    this.show = function() {
      // Draw top wall
      if (this.walls.top) {
        drawLine(
          this.x * CELL_SIZE,
          this.y * CELL_SIZE,
          (this.x + 1) * CELL_SIZE,
          this.y * CELL_SIZE
        )
      }
  
      // Draw right wall
      if (this.walls.right) {
        drawLine(
          (this.x + 1) * CELL_SIZE,
          this.y * CELL_SIZE,
          (this.x + 1) * CELL_SIZE,
          (this.y + 1) * CELL_SIZE
        )
      }
  
      // Draw bottom wall
      if (this.walls.bottom) {
        drawLine(
          this.x * CELL_SIZE,
          (this.y + 1) * CELL_SIZE,
          (this.x + 1) * CELL_SIZE,
          (this.y + 1) * CELL_SIZE
        )
      }
  
      // Draw left wall
      if (this.walls.left) {
        drawLine(
          this.x * CELL_SIZE,
          this.y * CELL_SIZE,
          this.x * CELL_SIZE,
          (this.y + 1) * CELL_SIZE
        )
      }
  
      if (this.wasVisited) {
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = 'rgb(100, 0, 255)'
        ctx.fillRect(this.x * CELL_SIZE, this.y * CELL_SIZE, CELL_SIZE - 1, CELL_SIZE - 1)
      }
    }

    this.checkNeighbors = function() {
      const neighbors = []

      const top = grid[this.x]?.[this.y - 1]
      const right = grid[this.x + 1]?.[this.y]
      const bottom = grid[this.x]?.[this.y + 1]
      const left = grid[this.x - 1]?.[this.y]

      if (top && !top.wasVisited) {
        neighbors.push(top)
      }

      if (right && !right.wasVisited) {
        neighbors.push(right)
      }

      if (bottom && !bottom.wasVisited) {
        neighbors.push(bottom)
      }

      if (left && !left.wasVisited) {
        neighbors.push(left)
      }

      if (neighbors.length > 0) {
        return neighbors[Math.floor(Math.random() * neighbors.length)]
      } else {
        return undefined
      }
    }
  }
}

function setup() {
  // Creating the canvas
  const app = document.getElementById('app')
  canvas = document.createElement('canvas')
  canvas.width = GRID_ROWS * CELL_SIZE
  canvas.height = GRID_COLS * CELL_SIZE
  app.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgb(25, 25, 25)'
  ctx.fillRect(0, 0, GRID_ROWS * CELL_SIZE, GRID_COLS * CELL_SIZE)

  // Making a 2D array
  grid = new Array(GRID_COLS)
  for (let i = 0; i < GRID_COLS; i++) {
    grid[i] = new Array(GRID_ROWS)

    for (let j = 0; j < GRID_ROWS; j++) {
      grid[i][j] = new Cell(i, j)
    }
  }

  current = grid[0][0]
}

function loop() {
  for (let i = 0; i < GRID_COLS; i++) {
    for (let j = 0; j < GRID_ROWS; j++) {
      grid[i][j].show()
    }
  }

  current.wasVisited = true
  current.highlight()

  const next = current.checkNeighbors()
  if (next) {
    next.wasVisited = true
    stack.push(current)
    removeWalls(current, next)
    current = next
  } else if (stack.length > 0) {
    current = stack.pop()
  } else {
    console.log('DONE!')
    clearInterval(int)
  }
}

setup()
int = setInterval(loop, LOOP_INTERVAL)

let isPaused = false

// Start/pause/resume searching when the spacebar is tapped
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    if (!isPaused) {
      clearInterval(int)
      console.log('PAUSED')
      isPaused = true
    } else {
      int = setInterval(loop, LOOP_INTERVAL)
      console.log('RESUMED')
      isPaused = false
    }
  }
})
