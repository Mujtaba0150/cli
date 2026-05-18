const iconSource = String.raw`
           @@@@@@@@@@@@@@@@@@@@@@@@@@
       @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
     @@@@@@@@@                    @@@@@@@@@
   @@@@@@@                            @@@@@@@
  @@@@@@                                @@@@@@
 @@@@@                                    @@@@@
@@@@@                                      @@@@@
@@@@@                                      @@@@@
@@@@@                                      @@@@@
@@@@@                                      @@@@@
@@@@@                                      @@@@
 @@@@@                                    @@@@@
  @@@@@@                                @@@@@@
   @@@@@@@                            @@@@@@@
     @@@@@@@@@@@                    @@@@@@@
        @@@@@@@@@@@@@@            @@@@@@@
        @@@@@@@@@@@@@@          @@@@@@@@
        @@@@@@@@@@@@@@        @@@@@@@@@@@@@
        @@@@@@@@@@@@@       @@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@     @@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@    @@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
`

const wordmarkSource = String.raw`
@@@@@@@   @@@@@@@@  @@@@@@@@  @@@@@@@   @@@@@@@@  @@@@@@@
@@    @@  @@        @@        @@    @@  @@        @@    @@
@@@@@@@   @@@@@@    @@@@@@    @@@@@@@   @@@@@@    @@@@@@@
@@    @@  @@        @@        @@        @@        @@  @@
@@    @@  @@        @@        @@        @@        @@   @@
@@@@@@@   @@@@@@@@  @@@@@@@@  @@        @@@@@@@@  @@    @@
`

const normalize = (source) => {
  const lines = source.trim().split('\n')
  const width = Math.max(...lines.map(line => line.length))
  return lines.map(line => line.padEnd(width, ' '))
}

const scale = (source, width, height) => {
  const lines = normalize(source)
  const sourceHeight = lines.length
  const sourceWidth = lines[0]?.length ?? 0
  const result = []

  for (let y = 0; y < height; y += 1) {
    let line = ''
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y / height) * sourceHeight))

    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x / width) * sourceWidth))
      line += lines[sourceY]?.[sourceX] === '@' ? '@' : ' '
    }

    result.push(line.trimEnd())
  }

  return result
}

const combine = (left, right, gap) => {
  const leftWidth = Math.max(...left.map(line => line.length))
  const height = Math.max(left.length, right.length)
  const topPadRight = 0
  const result = []

  for (let y = 0; y < height; y += 1) {
    const leftLine = left[y] ?? ''
    const rightLine = right[y - topPadRight] ?? ''
    result.push(`${leftLine.padEnd(leftWidth, ' ')}${' '.repeat(gap)}${rightLine}`.trimEnd())
  }

  return result
}

export function renderStartupLogo(columns = process.stdout.columns ?? 80) {
  const width = Math.max(32, columns - 2)
  const gap = width >= 70 ? 4 : 2
  const iconWidth = Math.max(12, Math.min(22, Math.floor(width * 0.28)))
  const wordWidth = Math.max(24, width - iconWidth - gap)
  const iconHeight = Math.max(7, Math.round(iconWidth * 0.42))
  const wordHeight = Math.max(5, Math.min(6, iconHeight))

  const icon = scale(iconSource, iconWidth, iconHeight)
  const wordmark = scale(wordmarkSource, wordWidth, wordHeight)
  return combine(icon, wordmark, gap).join('\n')
}
