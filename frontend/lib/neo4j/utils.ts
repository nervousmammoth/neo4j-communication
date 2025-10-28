/**
 * Utility functions for Neo4j data transformation
 *
 * This module contains helper functions for converting Neo4j-specific
 * data types to JavaScript/TypeScript types.
 */

import neo4j from 'neo4j-driver';

/**
 * Convert Neo4j DateTime object to ISO string
 * Returns null if input is null/undefined
 */
export function formatDateTime(dateTime: unknown): string | null {
  if (!dateTime) return null;

  if (neo4j.isDateTime(dateTime)) {
    return dateTime.toString();
  }

  // Handle Neo4j DateTime-like objects
  if (dateTime && typeof dateTime === 'object' && 'year' in dateTime) {
    const dateObj = dateTime as { year: unknown; month?: unknown; day?: unknown; hour?: unknown; minute?: unknown; second?: unknown };
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = dateObj.year;
    const monthNum = typeof dateObj.month === 'number' ? dateObj.month : 1;
    const dayNum = typeof dateObj.day === 'number' ? dateObj.day : 1;
    const hourNum = typeof dateObj.hour === 'number' ? dateObj.hour : 0;
    const minuteNum = typeof dateObj.minute === 'number' ? dateObj.minute : 0;
    const secondNum = typeof dateObj.second === 'number' ? dateObj.second : 0;

    // Validate date components
    if (typeof year !== 'number' || year < 1) {
      return null;
    }
    if (monthNum < 1 || monthNum > 12) {
      return null;
    }
    if (dayNum < 1 || dayNum > 31) {
      return null;
    }
    if (hourNum < 0 || hourNum > 23) {
      return null;
    }
    if (minuteNum < 0 || minuteNum > 59) {
      return null;
    }
    if (secondNum < 0 || secondNum > 59) {
      return null;
    }

    const month = pad(monthNum);
    const day = pad(dayNum);
    const hour = pad(hourNum);
    const minute = pad(minuteNum);
    const second = pad(secondNum);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
  }

  // If it's already a string, return it
  if (typeof dateTime === 'string') {
    return dateTime;
  }

  return null;
}

/**
 * Convert Neo4j Integer and DateTime objects to regular JavaScript types
 * This is a safety measure for any special Neo4j types that might still come through
 */
export function convertNeo4jIntegers(value: unknown): unknown {
  if (!value) return value;

  // Check if it's a Neo4j Integer object
  if (typeof value === 'object' && value !== null && 'low' in value && 'high' in value) {
    // Convert to number - Neo4j Integer objects have a toNumber method
    const intObj = value as { low: number; high: number; toNumber?: () => number };
    if (typeof intObj.toNumber === 'function') {
      return intObj.toNumber();
    }
    // Fallback for objects without toNumber method
    return intObj.low;
  }

  // Check if it's a Neo4j DateTime object
  if (typeof value === 'object' && value !== null && 'year' in value && 'month' in value && 'day' in value) {
    // Neo4j DateTime - use toString() method if it's a custom implementation
    const dateObj = value as { year: number; month: number; day: number; hour?: number; minute?: number; second?: number; toString?: () => string };
    // Check if toString exists and returns a valid date string (not [object Object])
    if (dateObj.toString && typeof dateObj.toString === 'function') {
      const str = dateObj.toString();
      // Only use toString() if it returns something other than the default [object Object]
      if (str !== '[object Object]') {
        return str;
      }
    }
    // Fallback: construct ISO string manually
    // This handles cases where the object has been copied and lost its methods
    // or only has the default Object.prototype.toString
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dateObj.year}-${pad(dateObj.month)}-${pad(dateObj.day)}T${pad(dateObj.hour || 0)}:${pad(dateObj.minute || 0)}:${pad(dateObj.second || 0)}Z`;
  }

  // Recursively process arrays
  if (Array.isArray(value)) {
    return value.map(convertNeo4jIntegers);
  }

  // Recursively process objects (but skip Date objects)
  if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
    const converted: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      converted[key] = convertNeo4jIntegers(val);
    }
    return converted;
  }

  return value;
}
