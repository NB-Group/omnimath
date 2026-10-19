// Land mask for the hero globe, baked from public/earth-map.png.
//
// The dot lattice samples an 81-row latitude grid; each row stores one bit per
// column, MSB first, packed across the whole grid. Baking it removes the only
// runtime dependency the globe had on an image fetch: a failed earth-map.png
// used to leave the globe as a featureless blue sphere.
//
// Regenerate with scripts/bake-land-mask.py if the source map changes.
export const LAND_MASK_BASE64 = [
  'AAAH//w+P/5/n//8H+H//+AHwP///AAjA/+//gAAQAD9//AAACAAAw/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'AAAAAAAAAAAAAAAAAAAAAAAAAAGAAAAAAAAAAAAAAAMgAAAAAAAAAAAAAAAYAAAAAAgAAAAAAAAADgAAAAAAAAAAAAAAAAAYAAAA',
  'AAAAAAADAAAAAA8AAAAAAAAAAAgIAAAAAB4AAAAAAAAAAAAAAAAAAAPwAAAAAAAAAAAwBAAAAAAD4AAAAAAAAAAAPAIAAAAAAP4A',
  'AABwAAAABw/gAAAAAAAD/AAAAPgAAAAH/+AAAAAAAAH/AAAAfgAAAAD//gAAAAAAAAf8AAAB/AAAAAP//AAAAAAAAA/4AAAD/CAA',
  'AAP//AAAAAAAAAH/wAAAf8YAAAA//8AAAAAAAAAf/gAAB/4wAAAAf/wIAAAAAAAAf/4AAA/+MAAAAB/4ACAAAAAAAP/+AAAH/4wA',
  'AAAH7AAAAAAAAAA//+AAAH/4AAAAAAxAAAAAAAAAA//+AAAH/4AAAAAABAAAAAAAAAAf//wAAB/+AAAAAAgSAAAAAAAAAP//8AAA',
  'f/gAAAA4AHgAAAAAAAAB///gAAB/+AAAAGAA8QAAAAAAAAH//gAAAf/4AAAAzoKAAAAAAAAAAP/4AAAA//4AAADPAAAAAAAAAAAA',
  '//AAAAH//gAAAY8AAAAAAAAAAAB/+AAAA///gAACwwAAAAAAAAAAAP+AAAf///8AAgAAQAAAAAAAAAAC/gAAD////wAQAAEAAAAA',
  'AAAAAEKAAAD////YAIAcAAAAAAAAAAAGAAAAD////wAMA+AAAAAAAAAAA8AAAAH///7wAwDwQAAAAAAAAA/AEAAAf///fgPh8CAA',
  'AAAAAAA8wgAAAf//+fwPx8AAAAAAAAAA4CAAAAf//+/w///gAAAAAAAAvAAAAAH///fQ///6AAAAAAAAfgQAAAB//+/X///8AAAA',
  'AAAD/BAAAAH///3////AAAAAAAB//gAAAD/nH/////AAAAAAAP/8AAAAfwB/////CAAAAAAf//AAAAHgD////8iAAAAAH//wAAAc',
  'Ff5///4gAAAAAP//gAAB5f/v///8IAAAAH//4AABzeGf///xAAAAA///AAAHvXf///9AAAAD//8QAB///////gAAAB//6AAD////',
  '//4AAAD/+/AAN//////iAAAf/vwAIf////8EAAH/xwACR////8MAI/+PAATP///+AB//4wQA7////7A//4hAD/////5//7GMFv//',
  '/+f/5OAf+//+O3U+Bgf//APZ8AL/IAIDwAHAALvgAYAD+QEAD8AAAgAAAAA=',
].join('')

export const LAND_MASK_ROWS = 81
export const LAND_MASK_MAX_COLUMNS = 160

let cached: Uint8Array | null = null

export function decodeLandMask(): Uint8Array {
  if (cached) return cached
  const binary = atob(LAND_MASK_BASE64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  cached = bytes
  return bytes
}
