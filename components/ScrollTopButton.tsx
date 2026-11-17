import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import smoothscroll from 'smoothscroll-polyfill'
import { getEditorScroller } from './ide/scroll'

const FLY_DURATION = 1100

export function ScrollTopButton() {
  let [show, setShow] = useState(false)
  let [flying, setFlying] = useState(false)
  let timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    smoothscroll.polyfill()
    // Inside the IDE workbench the editor scrolls, not the window
    let target: HTMLElement | Window = getEditorScroller() || window
    let handleScroll = () =>
      setShow((target instanceof Window ? target.scrollY : target.scrollTop) > 200)
    handleScroll()
    target.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      target.removeEventListener('scroll', handleScroll)
      clearTimeout(timer.current)
    }
  }, [])

  let handleClick = () => {
    if (flying) return
    setFlying(true)
    ;(getEditorScroller() || window).scrollTo({ top: 0, behavior: 'smooth' })
    timer.current = setTimeout(() => setFlying(false), FLY_DURATION)
  }

  return (
    <button
      aria-label="Scroll To Top"
      title="Bay lên đầu trang"
      type="button"
      onClick={handleClick}
      className={clsx(
        'doraemon-top fixed bottom-10 right-6 z-40 hidden md:block lg:right-[124px]',
        flying && 'is-flying',
        show || flying ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <DoraemonCopter />
    </button>
  )
}

function DoraemonCopter() {
  return (
    <svg
      viewBox="0 0 120 154"
      width="68"
      height="87"
      aria-hidden="true"
      className="doraemon-body drop-shadow-lg"
    >
      <defs>
        <radialGradient id="dr-head" cx="38%" cy="30%" r="75%">
          <stop offset="0" stopColor="#5CC8FA" />
          <stop offset="0.6" stopColor="#139BE0" />
          <stop offset="1" stopColor="#0A78B8" />
        </radialGradient>
        <radialGradient id="dr-face" cx="45%" cy="35%" r="70%">
          <stop offset="0.7" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E6EEF5" />
        </radialGradient>
        <radialGradient id="dr-nose" cx="35%" cy="35%" r="65%">
          <stop offset="0" stopColor="#FF6B6B" />
          <stop offset="1" stopColor="#C8102E" />
        </radialGradient>
        <radialGradient id="dr-bell" cx="35%" cy="30%" r="70%">
          <stop offset="0" stopColor="#FFF3A6" />
          <stop offset="0.5" stopColor="#F9CF1C" />
          <stop offset="1" stopColor="#D49A00" />
        </radialGradient>
        <linearGradient id="dr-blade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F6D27A" />
          <stop offset="1" stopColor="#C98A2B" />
        </linearGradient>
        <linearGradient id="dr-mouth" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B3122B" />
          <stop offset="1" stopColor="#E5303F" />
        </linearGradient>
      </defs>

      {/* Bamboo copter */}
      <g className="copter-blades">
        <path
          d="M60 10 C44 3 20 4 10 9 C20 14 44 15 60 10 Z"
          fill="url(#dr-blade)"
          stroke="#7A4E12"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path
          d="M60 10 C76 3 100 4 110 9 C100 14 76 15 60 10 Z"
          fill="url(#dr-blade)"
          stroke="#7A4E12"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </g>
      <rect
        x="57.5"
        y="10"
        width="5"
        height="20"
        rx="2.5"
        fill="#E3A945"
        stroke="#7A4E12"
        strokeWidth="1.3"
      />
      <line x1="58" y1="17" x2="62" y2="17" stroke="#7A4E12" strokeWidth="1" />
      <ellipse cx="60" cy="10" rx="4.5" ry="3" fill="#9C6418" stroke="#7A4E12" strokeWidth="1.2" />
      <ellipse cx="60" cy="31" rx="7" ry="2.5" fill="#7A4E12" />

      {/* Head */}
      <circle cx="60" cy="80" r="50" fill="url(#dr-head)" stroke="#16303F" strokeWidth="2.5" />
      <ellipse
        cx="40"
        cy="50"
        rx="14"
        ry="8"
        fill="#fff"
        opacity="0.35"
        transform="rotate(-30 40 50)"
      />

      {/* Face */}
      <path
        d="M60 46 C88 46 102 66 102 90 C102 116 84 128 60 128 C36 128 18 116 18 90 C18 66 32 46 60 46 Z"
        fill="url(#dr-face)"
        stroke="#16303F"
        strokeWidth="2"
      />

      {/* Eyes */}
      <ellipse cx="49" cy="52" rx="11" ry="14" fill="#fff" stroke="#16303F" strokeWidth="2" />
      <ellipse cx="71" cy="52" rx="11" ry="14" fill="#fff" stroke="#16303F" strokeWidth="2" />
      <ellipse cx="54" cy="56" rx="3.6" ry="5" fill="#16303F" />
      <ellipse cx="66" cy="56" rx="3.6" ry="5" fill="#16303F" />
      <circle cx="55.2" cy="54.2" r="1.3" fill="#fff" />
      <circle cx="67.2" cy="54.2" r="1.3" fill="#fff" />

      {/* Nose */}
      <circle cx="60" cy="70" r="7" fill="url(#dr-nose)" stroke="#16303F" strokeWidth="1.8" />
      <ellipse cx="57.5" cy="67.5" rx="2.2" ry="1.6" fill="#fff" opacity="0.9" />
      <line
        x1="60"
        y1="77"
        x2="60"
        y2="96"
        stroke="#16303F"
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Mouth */}
      <path
        d="M33 92 Q60 102 87 92 Q85 120 60 121 Q35 120 33 92 Z"
        fill="url(#dr-mouth)"
        stroke="#16303F"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M44 114 Q60 103 76 114 Q68 120.5 60 120.8 Q52 120.5 44 114 Z" fill="#FF8A8A" />

      {/* Whiskers */}
      <g stroke="#16303F" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M44 76 Q32 72 16 70" />
        <path d="M44 82 Q30 82 14 83" />
        <path d="M44 88 Q32 91 17 96" />
        <path d="M76 76 Q88 72 104 70" />
        <path d="M76 82 Q90 82 106 83" />
        <path d="M76 88 Q88 91 103 96" />
      </g>

      {/* Collar + bell */}
      <path
        d="M22 112 Q60 142 98 112 L100 120 Q60 152 20 120 Z"
        fill="#E5303F"
        stroke="#16303F"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="141" r="9" fill="url(#dr-bell)" stroke="#16303F" strokeWidth="1.8" />
      <path d="M51.6 138.5 Q60 136 68.4 138.5" stroke="#16303F" strokeWidth="1.5" fill="none" />
      <circle cx="60" cy="143.5" r="1.8" fill="#16303F" />
      <line x1="60" y1="145" x2="60" y2="149.5" stroke="#16303F" strokeWidth="1.4" />
      <ellipse cx="56.5" cy="137" rx="2.2" ry="1.4" fill="#fff" opacity="0.8" />
    </svg>
  )
}
