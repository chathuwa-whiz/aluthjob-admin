import { DotsThree } from '@phosphor-icons/react'
import { useState, type ReactNode } from 'react'
import { useDismiss } from '../lib/hooks'
import { cx } from '../lib/cx'
import { Button } from './Button'

export interface MenuItem {
  label: string
  icon?: ReactNode
  danger?: boolean
  onSelect: () => void
  disabled?: boolean
}

/** An overflow menu: closes on choosing, on Escape and on a click elsewhere. */
export function Menu({ items, label = 'More actions', trigger }: { items: MenuItem[]; label?: string; trigger?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useDismiss(open, () => setOpen(false))

  return (
    <div className="menu" ref={ref}>
      {trigger ? (
        <Button onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open} icon={trigger}>
          {label}
        </Button>
      ) : (
        <Button variant="secondary" onClick={() => setOpen((value) => !value)} aria-label={label} aria-haspopup="menu" aria-expanded={open} icon={<DotsThree size={20} weight="bold" />} />
      )}
      {open && (
        <div className="menu__list" role="menu">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cx('menu__item', item.danger && 'menu__item--danger')}
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
