import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { DEFAULT_SNAP_THRESHOLD, pieceSize, projectBounds, snapPosition } from '../../core/geometry'
import type { Axis, Piece, Project, Vector } from '../../core/model'

/** La scène est en millimètres ; les dixièmes du cœur ne sont convertis que pour l'affichage. */
const TENTHS_TO_MM = 0.1
const FIELD_OF_VIEW = 32
const VIEW_DIRECTION = new THREE.Vector3(0.65, 0.5, 1).normalize()
const DEFAULT_TARGET_SIZE = 1000
const CLICK_TOLERANCE_PX = 4
const SNAP_DISTANCE_PX = 8
const CAPTURE_WIDTH = 1600
const CAPTURE_HEIGHT = 1200
const AXES: readonly Axis[] = ['x', 'y', 'z']

const BACKGROUND_COLOR = 0xe9e7df
const WOOD_COLOR = 0xdcb27a
const SELECTED_COLOR = 0x7fbf9c
const OVERLAP_COLOR = 0xe08a7a
const EDGE_COLOR = 0x5b4326
const SELECTED_EDGE_COLOR = 0x1d4a34

export interface ViewportCallbacks {
  /** `null` : un clic dans le vide. */
  onPick(pieceId: string | null): void
  onMove(pieceId: string, position: Vector): void
}

interface PieceObjects {
  piece: Piece
  mesh: THREE.Mesh
  edges: THREE.LineSegments
}

function woodMaterial(color: number): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  })
}

function pieceCenter(piece: Piece, position: Vector = piece.position): THREE.Vector3 {
  const size = pieceSize(piece)
  return new THREE.Vector3(
    position.x + size.x / 2,
    position.y + size.y / 2,
    position.z + size.z / 2
  ).multiplyScalar(TENTHS_TO_MM)
}

export class Viewport {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 1, 100_000)
  private readonly controls: OrbitControls
  private readonly handles: TransformControls
  private readonly handleTarget = new THREE.Object3D()
  private readonly raycaster = new THREE.Raycaster()
  private readonly group = new THREE.Group()
  private readonly boxGeometry = new THREE.BoxGeometry(1, 1, 1)
  private readonly edgeGeometry = new THREE.EdgesGeometry(this.boxGeometry)
  private readonly materials = {
    wood: woodMaterial(WOOD_COLOR),
    selected: woodMaterial(SELECTED_COLOR),
    overlap: woodMaterial(OVERLAP_COLOR),
    edge: new THREE.LineBasicMaterial({ color: EDGE_COLOR }),
    selectedEdge: new THREE.LineBasicMaterial({ color: SELECTED_EDGE_COLOR })
  }
  private readonly resizeObserver: ResizeObserver
  private readonly objects = new Map<string, PieceObjects>()
  private project: Project | null = null
  private selection: readonly string[] = []
  private overlapping: ReadonlySet<string> = new Set()
  private pointerStart: { x: number; y: number; onHandle: boolean } | null = null
  private dragStart: Vector | null = null
  private dragPosition: Vector | null = null
  private renderPending = false
  private renderHandle = 0

  constructor(
    private readonly container: HTMLElement,
    private readonly callbacks: ViewportCallbacks
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(this.renderer.domElement)

    this.scene.background = new THREE.Color(BACKGROUND_COLOR)
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x9c8f7a, 2))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(0.5, 1, 0.8)
    this.scene.add(sun, this.group, this.handleTarget)

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.addEventListener('change', this.requestRender)

    this.handles = new TransformControls(this.camera, this.renderer.domElement)
    this.handles.setMode('translate')
    this.handles.addEventListener('change', this.requestRender)
    this.handles.addEventListener('dragging-changed', this.onDraggingChanged)
    this.handles.addEventListener('objectChange', this.onHandleMoved)
    this.scene.add(this.handles.getHelper())

    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp)

    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)
    this.resize()
    this.frame()
  }

  setProject(project: Project): void {
    this.project = project
    this.group.clear()
    this.objects.clear()
    for (const piece of project.pieces) {
      const size = pieceSize(piece)
      const scale = new THREE.Vector3(size.x, size.y, size.z).multiplyScalar(TENTHS_TO_MM)
      const center = pieceCenter(piece)

      const mesh = new THREE.Mesh(this.boxGeometry, this.materials.wood)
      const edges = new THREE.LineSegments(this.edgeGeometry, this.materials.edge)
      mesh.userData['pieceId'] = piece.id
      for (const object of [mesh, edges]) {
        object.scale.copy(scale)
        object.position.copy(center)
      }
      this.group.add(mesh, edges)
      this.objects.set(piece.id, { piece, mesh, edges })
    }
    this.container.dataset['pieceCount'] = String(project.pieces.length)
    this.applyMarks()
  }

  /** Met en évidence la sélection et les chevauchements. */
  setMarks(selection: readonly string[], overlapping: ReadonlySet<string>): void {
    this.selection = selection
    this.overlapping = overlapping
    this.applyMarks()
  }

  /** Recadre la vue pour montrer tout le meuble. */
  frame(): void {
    // Une marge large : les poignées d'une pièce en bordure doivent rester à l'écran.
    this.placeCamera(1.25)
    this.requestRender()
  }

  /** Une image du meuble pour le rapport : vue fixe sur fond blanc, sans sélection ni poignées. */
  captureImage(): string {
    const canvasSize = this.renderer.getSize(new THREE.Vector2())
    const pixelRatio = this.renderer.getPixelRatio()
    const position = this.camera.position.clone()
    const target = this.controls.target.clone()
    const { near, far, aspect } = this.camera
    const background = this.scene.background
    const handles = this.handles.getHelper()

    for (const { mesh, edges } of this.objects.values()) {
      mesh.material = this.materials.wood
      edges.material = this.materials.edge
    }
    handles.visible = false
    this.scene.background = new THREE.Color(0xffffff)
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(CAPTURE_WIDTH, CAPTURE_HEIGHT, false)
    this.camera.aspect = CAPTURE_WIDTH / CAPTURE_HEIGHT
    this.placeCamera(1.02)
    this.renderer.render(this.scene, this.camera)
    // Le tampon de dessin n'est lisible que juste après le rendu.
    const image = this.renderer.domElement.toDataURL('image/png')

    handles.visible = true
    this.scene.background = background
    this.renderer.setPixelRatio(pixelRatio)
    this.renderer.setSize(canvasSize.x, canvasSize.y, false)
    this.camera.aspect = aspect
    this.camera.near = near
    this.camera.far = far
    this.camera.updateProjectionMatrix()
    this.camera.position.copy(position)
    this.controls.target.copy(target)
    this.controls.update()
    this.applyMarks()
    this.render()
    return image
  }

  private placeCamera(margin: number): void {
    const bounds = this.project && projectBounds(this.project)
    const size = bounds
      ? new THREE.Vector3(bounds.size.x, bounds.size.y, bounds.size.z).multiplyScalar(TENTHS_TO_MM)
      : new THREE.Vector3(DEFAULT_TARGET_SIZE, DEFAULT_TARGET_SIZE, DEFAULT_TARGET_SIZE)
    const center = bounds
      ? new THREE.Vector3(
          (bounds.min.x + bounds.max.x) / 2,
          (bounds.min.y + bounds.max.y) / 2,
          (bounds.min.z + bounds.max.z) / 2
        ).multiplyScalar(TENTHS_TO_MM)
      : new THREE.Vector3()

    const radius = size.length() / 2
    const halfVertical = THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2)
    const halfHorizontal = Math.atan(Math.tan(halfVertical) * this.camera.aspect)
    const distance = (radius / Math.sin(Math.min(halfVertical, halfHorizontal))) * margin

    this.camera.near = distance / 100
    this.camera.far = distance * 20
    this.camera.updateProjectionMatrix()
    this.camera.position.copy(center).addScaledVector(VIEW_DIRECTION, distance)
    this.controls.target.copy(center)
    this.controls.update()
  }

  dispose(): void {
    cancelAnimationFrame(this.renderHandle)
    this.resizeObserver.disconnect()
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.handles.detach()
    this.handles.dispose()
    this.controls.dispose()
    this.boxGeometry.dispose()
    this.edgeGeometry.dispose()
    Object.values(this.materials).forEach((material) => material.dispose())
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private applyMarks(): void {
    const selected = new Set(this.selection)
    for (const [id, { mesh, edges }] of this.objects) {
      const isSelected = selected.has(id)
      mesh.material = isSelected
        ? this.materials.selected
        : this.overlapping.has(id)
          ? this.materials.overlap
          : this.materials.wood
      edges.material = isSelected ? this.materials.selectedEdge : this.materials.edge
    }
    this.syncHandles()
    this.requestRender()
  }

  /** Les poignées n'apparaissent que pour une seule pièce sélectionnée. */
  private syncHandles(): void {
    if (this.dragStart) return
    const only = this.selection.length === 1 ? this.objects.get(this.selection[0]!) : undefined
    if (only) {
      this.handleTarget.position.copy(pieceCenter(only.piece))
      this.handles.attach(this.handleTarget)
    } else {
      this.handles.detach()
    }
  }

  private readonly onDraggingChanged = (event: { value: unknown }): void => {
    const dragging = Boolean(event.value)
    this.controls.enabled = !dragging
    const only = this.selection.length === 1 ? this.objects.get(this.selection[0]!) : undefined
    if (dragging) {
      this.dragStart = only ? only.piece.position : null
      this.dragPosition = null
      return
    }
    const position = this.dragPosition
    this.dragStart = null
    this.dragPosition = null
    if (only && position) this.callbacks.onMove(only.piece.id, position)
  }

  private readonly onHandleMoved = (): void => {
    const only = this.selection.length === 1 ? this.objects.get(this.selection[0]!) : undefined
    if (!only || !this.dragStart || !this.project) return

    const size = pieceSize(only.piece)
    const start = this.dragStart
    const raw = this.handleTarget.position
    const position: Vector = { ...start }
    const moved: Axis[] = []
    for (const axis of AXES) {
      const tenths = Math.round(raw[axis] / TENTHS_TO_MM - size[axis] / 2)
      if (tenths !== start[axis]) {
        // Au millimètre près à la souris : pour une cote plus fine, on saisit la position.
        position[axis] = Math.round(tenths / 10) * 10
        moved.push(axis)
      }
    }

    const snapped = snapPosition(this.project, only.piece.id, position, this.snapThreshold())
    for (const axis of moved) position[axis] = snapped[axis]

    this.dragPosition = position
    const center = pieceCenter(only.piece, position)
    this.handleTarget.position.copy(center)
    only.mesh.position.copy(center)
    only.edges.position.copy(center)
    this.requestRender()
  }

  /** 5 mm au minimum, davantage quand la vue est éloignée : l'alignement doit rester atteignable. */
  private snapThreshold(): number {
    const distance = this.camera.position.distanceTo(this.handleTarget.position)
    const height = Math.max(this.container.clientHeight, 1)
    const mmPerPixel = (2 * distance * Math.tan(THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2))) / height
    return Math.max(DEFAULT_SNAP_THRESHOLD, Math.round((SNAP_DISTANCE_PX * mmPerPixel) / TENTHS_TO_MM))
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    this.pointerStart = { x: event.clientX, y: event.clientY, onHandle: this.handles.axis !== null }
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    const start = this.pointerStart
    this.pointerStart = null
    if (!start || start.onHandle || event.button !== 0) return
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_TOLERANCE_PX) return
    this.callbacks.onPick(this.pickAt(event.clientX, event.clientY))
  }

  private pickAt(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    )
    this.raycaster.setFromCamera(pointer, this.camera)
    const meshes = [...this.objects.values()].map(({ mesh }) => mesh)
    const [hit] = this.raycaster.intersectObjects(meshes, false)
    return hit ? (hit.object.userData['pieceId'] as string) : null
  }

  private readonly resize = (): void => {
    const width = Math.max(this.container.clientWidth, 1)
    const height = Math.max(this.container.clientHeight, 1)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    // Le navigateur efface le canevas dès qu'il change de taille : on redessine sans attendre.
    this.render()
  }

  /** Rendu à la demande : rien n'est calculé tant que la scène et la caméra ne bougent pas. */
  private readonly requestRender = (): void => {
    if (this.renderPending) return
    this.renderPending = true
    this.renderHandle = requestAnimationFrame(() => {
      this.renderPending = false
      this.render()
    })
  }

  private render(): void {
    this.renderer.render(this.scene, this.camera)
    this.publishHandlePoints()
  }

  /** Publie la position à l'écran des poignées, pour que les tests de bout en bout puissent les saisir. */
  private publishHandlePoints(): void {
    const { dataset } = this.container
    if (!this.handles.object) {
      for (const name of ['handleOrigin', 'handleX', 'handleY', 'handleZ']) delete dataset[name]
      return
    }
    const origin = this.handleTarget.position
    // Même échelle que le gabarit des poignées de TransformControls, dont la flèche mesure 0,5.
    const tan = Math.tan(THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2))
    const scale = (this.camera.position.distanceTo(origin) * Math.min(1.9 * tan, 7)) / 4
    const reach = 0.3 * scale
    dataset['handleOrigin'] = this.toScreen(origin)
    dataset['handleX'] = this.toScreen(origin.clone().add(new THREE.Vector3(reach, 0, 0)))
    dataset['handleY'] = this.toScreen(origin.clone().add(new THREE.Vector3(0, reach, 0)))
    dataset['handleZ'] = this.toScreen(origin.clone().add(new THREE.Vector3(0, 0, reach)))
  }

  private toScreen(point: THREE.Vector3): string {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const projected = point.clone().project(this.camera)
    const x = rect.left + ((projected.x + 1) / 2) * rect.width
    const y = rect.top + ((1 - projected.y) / 2) * rect.height
    return `${x},${y}`
  }
}
