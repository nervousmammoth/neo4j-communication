import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('combines class names', () => {
    const result = cn('text-red-500', 'bg-blue-500')
    expect(result).toBe('text-red-500 bg-blue-500')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const isDisabled = false
    const result = cn(
      'base-class',
      isActive && 'active-class',
      isDisabled && 'disabled-class'
    )
    expect(result).toBe('base-class active-class')
  })

  it('merges tailwind classes correctly', () => {
    // twMerge should handle conflicting classes
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('handles arrays of classes', () => {
    const result = cn(['text-sm', 'font-bold'], 'text-blue-500')
    expect(result).toBe('text-sm font-bold text-blue-500')
  })

  it('filters out falsy values', () => {
    const result = cn(
      'text-base',
      undefined,
      null,
      false,
      '',
      'text-lg'
    )
    // twMerge removes duplicate text utilities, keeping the last one
    expect(result).toBe('text-lg')
  })

  it('handles object syntax', () => {
    const result = cn({
      'text-red-500': true,
      'text-blue-500': false,
      'font-bold': true,
    })
    expect(result).toBe('text-red-500 font-bold')
  })

  it('returns empty string for no arguments', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles complex tailwind merging', () => {
    // Test that conflicting tailwind utilities are properly merged
    const result = cn(
      'text-red-500 hover:text-blue-500 p-4',
      'text-green-500 p-2'
    )
    expect(result).toBe('hover:text-blue-500 text-green-500 p-2')
  })

  it('preserves non-conflicting classes', () => {
    const result = cn(
      'flex items-center',
      'justify-between',
      'gap-4'
    )
    expect(result).toBe('flex items-center justify-between gap-4')
  })

  it('handles nested arrays', () => {
    const result = cn([
      'base',
      ['nested-1', 'nested-2'],
      'end'
    ])
    expect(result).toBe('base nested-1 nested-2 end')
  })

  it('works with tailwind arbitrary values', () => {
    const result = cn(
      'top-[117px]',
      'top-[120px]'
    )
    expect(result).toBe('top-[120px]')
  })

  it('handles whitespace correctly', () => {
    const result = cn(
      '  text-sm  ',
      '  font-bold  '
    )
    expect(result).toBe('text-sm font-bold')
  })
})