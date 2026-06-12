"use client"

import { useEffect, useRef } from "react"
import * as THREE from "three"

/**
 * WebGL hex-terrain backdrop for the landing page.
 * An instanced field of hexagonal columns ripples slowly outward from the
 * center; a handful of tiles glow in the four civ colors. The camera drifts
 * and follows the pointer with a soft parallax.
 *
 * Honors prefers-reduced-motion (renders one static frame) and pauses the
 * render loop while the tab is hidden.
 */

const BG = 0x09090b // zinc-950
const BASE_TILE = 0x18181b // zinc-900
const CIV_ACCENTS = [0xc0392b, 0x27ae60, 0xf39c12, 0x8e44ad, 0x6366f1]

const HEX = 1.0 // hex radius in world units
const RADIUS = 16 // grid radius in hexes
const GAP = 0.94 // shrink factor so seams show between tiles

export default function HexFieldCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      })
    } catch {
      return // WebGL unavailable — the CSS gradient behind us still shows
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(BG, 0)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(BG, 26, 64)

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200)
    camera.position.set(0, 20, 30)
    camera.lookAt(0, 0, 4)

    // ── Lights ──────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x6366f1, 0.35))
    const key = new THREE.DirectionalLight(0xa5b4fc, 1.1)
    key.position.set(-12, 22, 10)
    scene.add(key)
    const warm = new THREE.PointLight(0xf39c12, 60, 45, 2)
    warm.position.set(14, 7, -8)
    scene.add(warm)
    const cool = new THREE.PointLight(0x6366f1, 90, 50, 2)
    cool.position.set(-12, 8, 6)
    scene.add(cool)

    // ── Instanced hex columns ────────────────────────────────────────────────
    const cells: Array<{ x: number; z: number; phase: number; base: number }> = []
    for (let q = -RADIUS; q <= RADIUS; q++) {
      for (let r = Math.max(-RADIUS, -q - RADIUS); r <= Math.min(RADIUS, -q + RADIUS); r++) {
        const x = HEX * Math.sqrt(3) * (q + r / 2)
        const z = HEX * 1.5 * r
        const dist = Math.sqrt(x * x + z * z)
        cells.push({
          x,
          z,
          phase: dist * 0.55 + Math.random() * 0.6,
          base: 0.4 + Math.random() * 0.5,
        })
      }
    }

    const geometry = new THREE.CylinderGeometry(HEX * GAP, HEX * GAP, 1, 6)
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.35,
      metalness: 0.55,
      flatShading: true,
    })
    const mesh = new THREE.InstancedMesh(geometry, material, cells.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)

    const baseColor = new THREE.Color(BASE_TILE)
    const tmpColor = new THREE.Color()
    cells.forEach((cell, i) => {
      if (Math.random() < 0.035) {
        // Civ-colored accent tile
        tmpColor.setHex(CIV_ACCENTS[Math.floor(Math.random() * CIV_ACCENTS.length)])
        cell.base += 0.8
      } else {
        // Slight per-tile brightness variation on the zinc base
        tmpColor.copy(baseColor).offsetHSL(0, 0, (Math.random() - 0.5) * 0.035)
      }
      mesh.setColorAt(i, tmpColor)
    })
    scene.add(mesh)

    const dummy = new THREE.Object3D()
    const layout = (t: number) => {
      for (let i = 0; i < cells.length; i++) {
        const c = cells[i]
        const h = c.base + 0.55 * (1 + Math.sin(t * 0.9 - c.phase))
        dummy.position.set(c.x, h / 2 - 1.2, c.z)
        dummy.scale.set(1, h, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }

    // ── Resize ──────────────────────────────────────────────────────────────
    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      if (reducedMotion) {
        layout(0)
        renderer.render(scene, camera)
      }
    }
    const ro = new ResizeObserver(resize)
    ro.observe(container)
    resize()

    if (reducedMotion) {
      layout(0)
      renderer.render(scene, camera)
      return () => {
        ro.disconnect()
        geometry.dispose()
        material.dispose()
        renderer.dispose()
        renderer.domElement.remove()
      }
    }

    // ── Pointer parallax ─────────────────────────────────────────────────────
    const mouse = { x: 0, y: 0 }
    const onPointer = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("pointermove", onPointer)

    // ── Render loop ──────────────────────────────────────────────────────────
    let raf = 0
    const clock = new THREE.Clock()
    let elapsed = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      elapsed += clock.getDelta()
      layout(elapsed)

      // Slow drift + pointer parallax (eased)
      const targetX = Math.sin(elapsed * 0.06) * 3 + mouse.x * 2.2
      const targetY = 20 - mouse.y * 1.4
      camera.position.x += (targetX - camera.position.x) * 0.03
      camera.position.y += (targetY - camera.position.y) * 0.03
      camera.lookAt(0, 0, 4)

      renderer.render(scene, camera)
    }
    animate()

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        clock.stop()
      } else {
        clock.start()
        animate()
      }
    }
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("pointermove", onPointer)
      ro.disconnect()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full"
    />
  )
}
