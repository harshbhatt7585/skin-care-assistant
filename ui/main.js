const POINT_COUNT = 100

const pointLayer = document.createElement('div')
pointLayer.className = 'point-layer'

if (document.body.firstChild) {
  document.body.insertBefore(pointLayer, document.body.firstChild)
} else {
  document.body.appendChild(pointLayer)
}

const createPoint = () => {
  const point = document.createElement('div')
  point.className = 'point'
  point.style.left = `${Math.random() * 100}%`
  point.style.top = `${Math.random() * 100}%`
  point.style.setProperty('--delay', `${(Math.random() * 4).toFixed(2)}s`)
  point.style.setProperty('--duration', `${(5 + Math.random() * 4).toFixed(2)}s`)
  point.style.setProperty('--size', `${(Math.random() * 6 + 4).toFixed(2)}px`)
  point.innerHTML = `
    <div class="point__inner">
      <div class="point__inner__inner"></div>
    </div>
  `
  return point
}

const fragment = document.createDocumentFragment()
Array.from({ length: POINT_COUNT }).forEach(() => {
  fragment.appendChild(createPoint())
})

pointLayer.appendChild(fragment)
