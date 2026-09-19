import { useEffect, useRef, useMemo } from 'react'

interface ContribDay {
  date: string
  count: number
  level: 0 | 1 | 2 | 3 | 4
}

interface Props {
  contributions: ContribDay[]
}

const CELL = 11   // cell size px
const GAP = 2     // gap px
const STEP = CELL + GAP
const COLS = 52
const ROWS = 7
const SNAKE_LEN = 6
const FPS = 14    // frames per second

const EMPTY_COLOR = '#161b22'
const BORDER_COLOR = '#21262d'
const BG_COLOR = '#0d1117'
const SNAKE_HEAD = '#39d353'
const SNAKE_BODY = '#26a641'
const SNAKE_TAIL = '#006d32'

// Level → base cell color (eaten cells turn to EMPTY_COLOR)
const LEVEL_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']
// Eye color
const EYE_COLOR = '#0d1117'

// Build boustrophedon path through all 52×7 cells
function buildPath(): [number, number][] {
  const path: [number, number][] = []
  for (let col = 0; col < COLS; col++) {
    const rows = col % 2 === 0
      ? Array.from({ length: ROWS }, (_, r) => r)
      : Array.from({ length: ROWS }, (_, r) => ROWS - 1 - r)
    for (const row of rows) {
      path.push([col, row])
    }
  }
  return path
}

// Convert contributions array to 52×7 grid of levels
function buildGrid(contributions: ContribDay[]): number[][] {
  const grid: number[][] = Array.from({ length: COLS }, () => Array(ROWS).fill(0))
  const days = contributions.slice(-COLS * ROWS)
  days.forEach((day, i) => {
    const col = Math.floor(i / ROWS)
    const row = i % ROWS
    if (col < COLS && row < ROWS) grid[col][row] = day.level
  })
  return grid
}

export default function SnakeContrib({ contributions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const path = useMemo(() => buildPath(), [])
  const origGrid = useMemo(() => buildGrid(contributions), [contributions])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    // Mutable state
    const grid = origGrid.map((col) => [...col])
    let headIdx = 0
    let raf: number
    let lastTime = 0
    const interval = 1000 / FPS

    function cellXY(col: number, row: number) {
      return { x: col * STEP, y: row * STEP }
    }

    function drawCell(col: number, row: number, color: string) {
      const { x, y } = cellXY(col, row)
      ctx.fillStyle = BORDER_COLOR
      ctx.fillRect(x, y, CELL, CELL)
      ctx.fillStyle = color
      ctx.fillRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1)
    }

    function drawSnake(snakeIndices: number[]) {
      snakeIndices.forEach((idx, i) => {
        const [col, row] = path[idx]
        let color: string
        const t = i / (snakeIndices.length - 1)
        if (i === 0) color = SNAKE_HEAD
        else if (t < 0.5) color = SNAKE_BODY
        else color = SNAKE_TAIL
        drawCell(col, row, color)

        // Eyes on head
        if (i === 0) {
          const { x, y } = cellXY(col, row)
          const next = snakeIndices[1]
          const [nc, nr] = next !== undefined ? path[next] : path[Math.max(0, idx - 1)]
          const dx = col - nc
          const dy = row - nr
          // place eyes perpendicular to direction
          ctx.fillStyle = EYE_COLOR
          if (dx !== 0) {
            // moving horizontally — eyes top/bottom
            ctx.fillRect(x + CELL * 0.6, y + 1.5, 1.5, 1.5)
            ctx.fillRect(x + CELL * 0.6, y + CELL - 3, 1.5, 1.5)
          } else {
            // moving vertically — eyes left/right
            ctx.fillRect(x + 1.5, y + CELL * 0.6, 1.5, 1.5)
            ctx.fillRect(x + CELL - 3, y + CELL * 0.6, 1.5, 1.5)
          }
        }
      })
    }

    function draw() {
      ctx.fillStyle = BG_COLOR
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw all cells from grid
      for (let col = 0; col < COLS; col++) {
        for (let row = 0; row < ROWS; row++) {
          drawCell(col, row, LEVEL_COLORS[grid[col][row]])
        }
      }
    }

    function tick() {
      // Build snake body indices (headIdx going backward along path)
      const snakeIndices: number[] = []
      for (let i = 0; i < SNAKE_LEN; i++) {
        const idx = headIdx - i
        if (idx >= 0) snakeIndices.push(idx)
      }

      // Eat the cell under the head
      const [hcol, hrow] = path[headIdx]
      grid[hcol][hrow] = 0

      draw()
      drawSnake(snakeIndices)

      // Advance head
      headIdx++

      // Reset when done — restore grid and restart
      if (headIdx >= path.length) {
        headIdx = 0
        for (let col = 0; col < COLS; col++) {
          for (let row = 0; row < ROWS; row++) {
            grid[col][row] = origGrid[col][row]
          }
        }
      }
    }

    function loop(ts: number) {
      raf = requestAnimationFrame(loop)
      if (ts - lastTime < interval) return
      lastTime = ts
      tick()
    }

    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [origGrid, path])

  const W = COLS * STEP
  const H = ROWS * STEP

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      style={{ imageRendering: 'pixelated', display: 'block', width: '100%', maxWidth: W }}
    />
  )
}
