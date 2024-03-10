const LOOP_INTERVAL = 100

const GRID_COLS = 10
const GRID_ROWS = GRID_COLS

const CELL_SIZE = window.innerHeight < window.innerWidth
  ? (window.innerHeight - 16) / GRID_ROWS
  : (window.innerWidth - 16) / GRID_COLS

let grid = []
let path = []

const stack = [] // Cells that have been re-visited when generating
const openSet = [] // Cells that need to be evaluated for pathfinding
const closedSet = [] // Cells that have been evaluated for pathfinding

let int, canvas, current, goal

let isGenerationFinished = false
let isSearchingFinished

function drawSide(side, position) {
  if (side < 1 || side > 6) return

  const hexagonSize = CELL_SIZE / 2
  const hexagonWidth = Math.sqrt(3) * hexagonSize
  const hexagonHeight = 2 * hexagonSize

  const ctx = canvas.getContext('2d')
  ctx.strokeStyle = 'rgb(255, 255, 255)'
  ctx.lineWidth = 2
  ctx.beginPath()

  const x = (position.x * hexagonWidth + (position.y % 2) * hexagonWidth / 2) + CELL_SIZE / 2
  const y = (position.y * hexagonHeight * 0.75) + CELL_SIZE / 2

  ctx.moveTo(x + hexagonSize * Math.sin((side - 1) * 2 * Math.PI / 6), y + hexagonSize * Math.cos((side - 1) * 2 * Math.PI / 6))
  ctx.lineTo(x + hexagonSize * Math.sin(side * 2 * Math.PI / 6), y + hexagonSize * Math.cos(side * 2 * Math.PI / 6))

  ctx.stroke()
}

function distBetween(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function removeWalls(a, b) {
  let x = a.x - b.x
  let y = a.y - b.y

  const rowIsOdd = a.y % 2 === 1

  if ((!rowIsOdd && x === 0 && y === -1) || (rowIsOdd && x === -1 && y === -1)) {
    // BOTTOM RIGHT NEIGHBOR
    a.walls[0] = false
    b.walls[3] = false
    return
  }

  if (x === -1 && y === 0) {
    // RIGHT NEIGHBOR
    a.walls[1] = false
    b.walls[4] = false
    return
  }

  if ((!rowIsOdd && x === 0 && y === 1) || (rowIsOdd && x === -1 && y === 1)) {
    // TOP RIGHT NEIGHBOR
    a.walls[2] = false
    b.walls[5] = false
    return
  }

  if ((!rowIsOdd && x === 1 && y === 1) || (rowIsOdd && x === 0 && y === 1)) {
    // TOP LEFT NEIGHBOR
    a.walls[3] = false
    b.walls[0] = false
    return
  }

  if (x === 1 && y === 0) {
    // LEFT NEIGHBOR
    a.walls[4] = false
    b.walls[1] = false
    return
  }

  if ((!rowIsOdd && x === 1 && y === -1) || (rowIsOdd && x === 0 && y === -1)) {
    // BOTTOM LEFT NEIGHBOR
    a.walls[5] = false
    b.walls[2] = false
    return
  }
}

function removeFromArray(arr, el) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] == el) {
      arr.splice(i, 1)
    }
  }
}

class Cell {
  constructor(x, y) {
    // Location
    this.x = x
    this.y = y

    // Distance
    this.f = 0
    this.g = 0
    this.h = 0

    this.walls = [
      true, // bottomRight
      true, // right
      true, // topRight
      true, // topLeft
      true, // left
      true // bottomLeft
    ]

    this.wasVisited = false // When generating
    this.neighbor = null // Linked/communicating neighbor
    this.previous = null

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

      this.walls.map((isWall, idx) => {
        if (isWall) drawSide(idx + 1, position)
      })

      const isInStack = stack.find(cell => cell.x === this.x && cell.y === this.y)
  
      if (this.wasVisited) {
        if (isInStack) {
          this.highlight('rgb(100, 0, 255)')
        } else {
          this.highlight('rgb(200, 0, 255)')
        }
      }
    }

    this.checkNeighbors = function() {
      const neighbors = []

      const rowIsOdd = this.y % 2 === 1

      const bottomRight = rowIsOdd ? grid[this.x + 1]?.[this.y + 1] : grid[this.x]?.[this.y + 1]
      const right = grid[this.x + 1]?.[this.y]
      const topRight = rowIsOdd ? grid[this.x + 1]?.[this.y - 1] : grid[this.x]?.[this.y - 1]
      const topLeft = rowIsOdd ? grid[this.x]?.[this.y - 1] : grid[this.x - 1]?.[this.y - 1]
      const left = grid[this.x - 1]?.[this.y]
      const bottomLeft = rowIsOdd ? grid[this.x]?.[this.y + 1] : grid[this.x - 1]?.[this.y + 1]

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
        const neighbor = neighbors[Math.floor(Math.random() * neighbors.length)]
        this.neighbor = neighbor
        return neighbor
      } else {
        return undefined
      }
    }
  }
}

function aStarPathfinding() {
  if (!goal) return
  goal.highlight('rgb(255, 155, 100)')
  
  // A* algo
  if (openSet.length > 0) {
    let lowestF = 0
    // Evaluate every cell in the open set
    for (let i = 0; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestF].f) {
        lowestF = i
      }
    }

    current = openSet[lowestF]

    if (current === goal) {
      console.log('DONE!')
      clearInterval(int)
      isSearchingFinished = true
    }

    // Remove current spot from the open set and add it to the closed set
    removeFromArray(openSet, current)
    closedSet.push(current)

    if (!closedSet.includes(current.neighbor)) {
      // Distance from start to neighbor
      let tentativeG = current.g + 1 // TODO 1 being the distance between current and the neighbor
      let isNewPath = false

      if (openSet.includes(current.neighbor)) {
        if (tentativeG < current.neighbor.g) {
          current.neighbor.g = tentativeG
          isNewPath = true
        }
      } else {
        current.neighbor.g = tentativeG
        isNewPath = true
        openSet.push(current.neighbor)
      }

      if (isNewPath) {
        current.neighbor.h = distBetween(current.neighbor, goal) // Distance between the neighbor and the goal (heuristic cost estimate?)
        current.neighbor.f = current.neighbor.g + current.neighbor.h
        current.neighbor.previous = current
      }
    }
  } else {
    // TODO There should always be a solution, right?
    console.log('NO SOLUTION FOR PATHFINDING :(')
    clearInterval(int)
    isSearchingFinished = true
  }

  // Find the path
  path = []
  let temp = current
  path.push(current)
  while (temp?.previous) {
    path.push(temp.previous)
    temp = temp.previous
  }

  // Highlight the cells in the path
  for (let i = 0; i < path.length; i++) {
    path[i]?.highlight('rgb(100, 0, 255)')
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

  if (isGenerationFinished) {
    // aStarPathfinding()
  } else {
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
      isGenerationFinished = true
      clearInterval(int)
    }
  }
}

setup()
int = setInterval(loop, LOOP_INTERVAL)

let isPaused = false

// Start/pause/resume searching when the spacebar is tapped
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    if (isGenerationFinished && isSearchingFinished) return

    // TODO
    if (!isGenerationFinished || !isSearchingFinished) {
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

    // TODO
    if (isGenerationFinished && !isSearchingFinished) {
      if (!goal) {
        const randomX = Math.floor(Math.random() * GRID_COLS)
        const randomY = randomX === 0 ? Math.floor(Math.random() * GRID_ROWS - 1) + 1 : Math.floor(Math.random() * GRID_ROWS)

        // Set cell goal
        goal = grid[randomX][randomY]
        goal.highlight('rgb(255, 155, 100)')
        
        // Init open set
        openSet.push(current)

        isPaused = true
      }
    }
  }
})
