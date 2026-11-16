import type { JSX } from 'solid-js'

// 24px grid, 1.75 stroke, round caps. aria-hidden: the button carries the label.
function Icon(props: { children: JSX.Element; class?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      class={props.class ?? 'size-5'}
    >
      {props.children}
    </svg>
  )
}

type P = { class?: string }

export const IconFirst = (p: P) => (
  <Icon class={p.class}>
    <path d="M6 5v14M18 6l-7 6 7 6" />
  </Icon>
)
export const IconPrev = (p: P) => (
  <Icon class={p.class}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
)
export const IconNext = (p: P) => (
  <Icon class={p.class}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
)
export const IconLast = (p: P) => (
  <Icon class={p.class}>
    <path d="M18 5v14M6 6l7 6-7 6" />
  </Icon>
)
export const IconFlip = (p: P) => (
  <Icon class={p.class}>
    <path d="M7 4v16M3.5 7.5 7 4l3.5 3.5M17 20V4M13.5 16.5 17 20l3.5-3.5" />
  </Icon>
)
export const IconSun = (p: P) => (
  <Icon class={p.class}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Icon>
)
export const IconMoon = (p: P) => (
  <Icon class={p.class}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
  </Icon>
)
export const IconSystem = (p: P) => (
  <Icon class={p.class}>
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M8 20h8M12 16v4" />
  </Icon>
)
export const IconList = (p: P) => (
  <Icon class={p.class}>
    <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
)
export const IconClose = (p: P) => (
  <Icon class={p.class}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
export const IconFile = (p: P) => (
  <Icon class={p.class}>
    <path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5Z" />
    <path d="M14 3v4.5h4.5" />
  </Icon>
)
export const IconPaste = (p: P) => (
  <Icon class={p.class}>
    <rect x="6" y="4.5" width="12" height="16" rx="1.5" />
    <path d="M9.5 4.5V3.5h5v1M9 10h6M9 14h6" />
  </Icon>
)
export const IconCheck = (p: P) => (
  <Icon class={p.class}>
    <path d="M5 12.5 10 17l9-10" />
  </Icon>
)
