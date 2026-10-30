import { describe, expect, it } from 'vitest'
import { cameraDistanceFor, isCompactWidth } from '@/app/projects/sceneLayout'

describe('cameraDistanceFor', () => {
  it('pulls the camera back as the container narrows', () => {
    expect([480, 481, 768, 769, 1024, 1025, 1440].map(cameraDistanceFor)).toEqual([36, 28, 28, 25, 25, 20, 20])
  })
})

describe('isCompactWidth', () => {
  it('is compact up to 640px wide, but not before the container is measured', () => {
    expect([0, 320, 640, 641].map(isCompactWidth)).toEqual([false, true, true, false])
  })
})
