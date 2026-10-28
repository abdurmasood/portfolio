// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { APP, APPS, APP_IDS, DOCK_FAVORITES, IMPLEMENTED_APPS } from '@/components/rafeyos/core/catalog/apps'
import { APP_COMPONENTS } from '@/components/rafeyos/apps/appComponents'
import { AppIcon } from '@/components/rafeyos/ui/icons/appIcons'

afterEach(cleanup)

// The app lists live in several layers; these checks keep them in step
describe('app registries', () => {
  it('keys every app by its own id', () => {
    Object.entries(APPS).forEach(([key, entry]) => expect(entry.id).toBe(key))
  })

  it('names every app id in APP', () => {
    expect([...APP_IDS].sort()).toEqual(Object.values(APP).sort())
  })

  it('implements and docks only known apps', () => {
    IMPLEMENTED_APPS.forEach((id) => expect(APP_IDS).toContain(id))
    DOCK_FAVORITES.forEach((id) => expect(APP_IDS).toContain(id))
  })

  it('has a component for exactly the implemented apps', () => {
    expect(Object.keys(APP_COMPONENTS).sort()).toEqual([...IMPLEMENTED_APPS].sort())
  })

  it('has an icon for every app', () => {
    APP_IDS.forEach((id) => expect(() => render(<AppIcon name={id} />)).not.toThrow())
  })

  it('has a launcher tile for every app', () => {
    APP_IDS.forEach((id) => expect(() => render(<AppIcon name={id} tile />)).not.toThrow())
  })
})
