"use client"

function IconInstagram({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="ig-radial" cx="30%" cy="107%" r="150%">
          <stop offset="0%"   stopColor="#FFDC80" />
          <stop offset="10%"  stopColor="#FCAF45" />
          <stop offset="30%"  stopColor="#F77737" />
          <stop offset="50%"  stopColor="#F56040" />
          <stop offset="60%"  stopColor="#FD1D1D" />
          <stop offset="90%"  stopColor="#C13584" />
          <stop offset="100%" stopColor="#405DE6" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill="url(#ig-radial)" />
      {/* strokeWidth réduit à 1.2 pour un rendu plus fin */}
      <rect x="6.5" y="6.5" width="11" height="11" rx="3.2" stroke="white" strokeWidth="1.2" fill="none" />
      <circle cx="12" cy="12" r="2.6" stroke="white" strokeWidth="1.2" fill="none" />
      <circle cx="16.8" cy="7.2" r="0.7" fill="white" />
    </svg>
  )
}

function IconLinkedIn({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* rx augmenté à 5 pour adoucir les coins */}
      <rect width="24" height="24" rx="5" fill="#0A66C2" />
      <path
        d="M7.2 9.6H9.6V16.8H7.2V9.6ZM8.4 8.55C7.62 8.55 7 7.93 7 7.15C7 6.37 7.62 5.75 8.4 5.75C9.18 5.75 9.8 6.37 9.8 7.15C9.8 7.93 9.18 8.55 8.4 8.55Z"
        fill="white"
      />
      <path
        d="M11.2 9.6H13.5V10.67H13.53C13.86 10.06 14.64 9.42 15.81 9.42C18.24 9.42 18.7 11.01 18.7 13.09V16.8H16.3V13.57C16.3 12.67 16.28 11.51 15.04 11.51C13.78 11.51 13.59 12.49 13.59 13.5V16.8H11.2V9.6Z"
        fill="white"
      />
    </svg>
  )
}

const ICONS = {
  Instagram: IconInstagram,
  LinkedIn:  IconLinkedIn,
} as const

export type SocialKey = keyof typeof ICONS

interface SocialLinkProps {
  platform: SocialKey
  href: string
  label: string
  size?: number
}

export function SocialLink({ platform, href, label, size = 16 }: SocialLinkProps) {
  const Icon = ICONS[platform]

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.45rem",
        fontSize: "0.82rem",
        color: "var(--texte)",
        transition: "opacity 0.2s",
        textDecoration: "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      <Icon size={size} />
      <span>{label}</span>
    </a>
  )
}