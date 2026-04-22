"use client"
import { useEffect, useRef } from "react"

export function BibOverlays() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const cursor = cursorRef.current
    const marker = markerRef.current
    if (!cursor || !marker) return

    let cx = window.innerWidth / 2
    let cy = window.innerHeight / 2
    let tx = cx
    let ty = cy
    let raf = 0

    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    const anim = () => {
      cx += (tx - cx) * 0.22
      cy += (ty - cy) * 0.22
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`
      raf = requestAnimationFrame(anim)
    }

    const hoverSel = 'a, button, [data-hover], .bib-region-node'
    const onEnter = () => cursor.classList.add("hover")
    const onLeave = () => cursor.classList.remove("hover")
    const bind = () => {
      document.querySelectorAll<HTMLElement>(hoverSel).forEach(el => {
        el.addEventListener("mouseenter", onEnter)
        el.addEventListener("mouseleave", onLeave)
      })
    }

    const secIO = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const n = (e.target as HTMLElement).dataset.section
          const t = (e.target as HTMLElement).dataset.title
          marker.innerHTML = `<b>§ ${n}</b> &nbsp; ${t} &nbsp;·&nbsp; BLACK IN BLOCKCHAIN`
        }
      })
    }, { threshold: 0.35 })
    document.querySelectorAll("[data-section]").forEach(s => secIO.observe(s))

    document.addEventListener("mousemove", onMove)
    raf = requestAnimationFrame(anim)
    bind()

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("mousemove", onMove)
      document.querySelectorAll<HTMLElement>(hoverSel).forEach(el => {
        el.removeEventListener("mouseenter", onEnter)
        el.removeEventListener("mouseleave", onLeave)
      })
      secIO.disconnect()
    }
  }, [])

  return (
    <>
      <div className="bib-cursor" ref={cursorRef} aria-hidden />
      <div className="bib-grain" aria-hidden />
      <div className="bib-vignette" aria-hidden />
      <div className="bib-side-marker" ref={markerRef} aria-hidden>
        <b>§ 01</b>&nbsp; GENESIS &nbsp;·&nbsp; BLACK IN BLOCKCHAIN
      </div>
    </>
  )
}
