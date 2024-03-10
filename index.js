const LOOP_INTERVAL = 30

const GRID_COLS = 30
const GRID_ROWS = GRID_COLS

const CELL_SIZE = window.innerHeight < window.innerWidth
  ? (window.innerHeight - 16) / GRID_ROWS
  : (window.innerWidth - 16) / GRID_COLS

let grid = []
const stack = []
const visitedCells = []
const unvisitedCells = []
let int, canvas, current

function drawSide(side, position) {
  if (side < 1 || side > 6) return

  const hexagonSize = CELL_SIZE / 2
  const hexagonWidth = Math.sqrt(3) * hexagonSize
  const hexagonHeight = 2 * hexagonSize

  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = 'rgb(255, 255, 255)'
  ctx.lineWidth = 1
  ctx.beginPath()

  const x = (position.x * hexagonWidth + (position.y % 2) * hexagonWidth / 2) + CELL_SIZE / 2
  const y = (position.y * hexagonHeight * 0.75) + CELL_SIZE / 2

  ctx.moveTo(x + hexagonSize * Math.sin((side - 1) * 2 * Math.PI / 6), y + hexagonSize * Math.cos((side - 1) * 2 * Math.PI / 6))
  ctx.lineTo(x + hexagonSize * Math.sin(side * 2 * Math.PI / 6), y + hexagonSize * Math.cos(side * 2 * Math.PI / 6))

  ctx.stroke()
}

function removeWalls(a, b) {
  const x = a.x - b.x
  const y = a.y - b.y

  if (x === 0 && y === -1) {
    // BOTTOM RIGHT NEIGHBOR
    a.walls.bottomRight = false
    b.walls.topLeft = false
    return
  }

  if (x === -1 && y === 0) {
    // RIGHT NEIGHBOR
    a.walls.right = false
    b.walls.left = false
    return
  }

  if (x === 0 && y === 1) {
    // TOP RIGHT NEIGHBOR
    a.walls.topRight = false
    b.walls.bottomLeft = false
    return
  }

  if (x === -1 && y === 1) {
    // TOP LEFT NEIGHBOR
    a.walls.topLeft = false
    b.walls.bottomRight = false
    return
  }

  if (x === 1 && y === 0) {
    // LEFT NEIGHBOR
    a.walls.left = false
    b.walls.right = false
    return
  }

  if (x === -1 && y === -1) {
    // BOTTOM LEFT NEIGHBOR
    a.walls.bottomLeft = false
    b.walls.topRight = false
    return
  }
}

class Cell {
  constructor(x, y) {
    this.x = x
    this.y = y

    this.walls = {
      bottomRight: true,
      right: true,
      topRight: true,
      topLeft: true,
      left: true,
      bottomLeft: true
    }

    this.wasVisited = false

    this.highlight = function(color) {
      const ctx = canvas.getContext('2d')

      const hexagonSize = CELL_SIZE / 2
      const hexagonWidth = Math.sqrt(3) * hexagonSize
      const hexagonHeight = 2 * hexagonSize

      ctx.beginPath()

      const x = (this.x * hexagonWidth + (this.y % 2) * hexagonWidth / 2) + CELL_SIZE / 2
      const y = (this.y * hexagonHeight * 0.75) + CELL_SIZE / 2

      ctx.moveTo(x + hexagonSize * Math.sin(0), y + hexagonSize * Math.cos(0))

      for (let side = 0; side < 7; side++) {
        ctx.lineTo(x + hexagonSize * Math.sin(side * 2 * Math.PI / 6), y + hexagonSize * Math.cos(side * 2 * Math.PI / 6))
      }

      ctx.fillStyle = color ? color : 'rgb(100, 155, 100)'
      ctx.fill()
    }

    this.show = function() {
      // 1 = bottom right
      // 2 = right
      // 3 = top right
      // 4 = top left
      // 5 = left
      // 6 = bottom left

      const position = { x: this.x, y: this.y }

      if (this.walls.bottomRight) drawSide(1, position)
      if (this.walls.right) drawSide(2, position)
      if (this.walls.topRight) drawSide(3, position)
      if (this.walls.topLeft) drawSide(4, position)
      if (this.walls.left) drawSide(5, position)
      if (this.walls.bottomLeft) drawSide(6, position)
  
      if (this.wasVisited) {
        this.highlight('rgb(100, 0, 255)')
      }
    }

    this.checkNeighbors = function() {
      const neighbors = []

      const yIsOdd = this.y % 2 === 1

      const bottomRight = yIsOdd ? grid[this.x + 1]?.[this.y + 1] : grid[this.x]?.[this.y + 1]
      const right = grid[this.x + 1]?.[this.y]
      const topRight = yIsOdd ? grid[this.x + 1]?.[this.y - 1] : grid[this.x]?.[this.y - 1]
      const topLeft = yIsOdd ? grid[this.x]?.[this.y - 1] : grid[this.x - 1]?.[this.y - 1]
      const left = grid[this.x - 1]?.[this.y]
      const bottomLeft = yIsOdd ? grid[this.x]?.[this.y + 1] : grid[this.x - 1]?.[this.y + 1]

      if (bottomRight && !bottomRight.wasVisited) {
        neighbors.push(bottomRight)
      }

      if (right && !right.wasVisited) {
        neighbors.push(right)
      }

      if (topRight && !topRight.wasVisited) {
        neighbors.push(topRight)
      }

      if (topLeft && !topLeft.wasVisited) {
        neighbors.push(topLeft)
      }
      
      if (left && !left.wasVisited) {
        neighbors.push(left)
      }

      if (bottomLeft && !bottomLeft.wasVisited) {
        neighbors.push(bottomLeft)
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
  ctx.fillStyle = 'rgba(25, 25, 25, 0.7)'
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
  current.highlight('rgb(255, 0, 100)')

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
