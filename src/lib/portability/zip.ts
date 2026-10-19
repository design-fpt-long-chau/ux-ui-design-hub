// Portable ZIP (STORE method): no runtime/cloud dependency, no decompression bombs.
export const MAX_PACKAGE_BYTES = 100 * 1024 * 1024;
function crc(bytes: Uint8Array) {
  let value = 0xffffffff;
  for (const byte of bytes) { value ^= byte; for (let i = 0; i < 8; i++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0); }
  return (value ^ 0xffffffff) >>> 0;
}
export function encodeZip(entries: Map<string, Uint8Array>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [], directory: Uint8Array[] = [];
  let offset = 0, directorySize = 0;
  for (const [name, bytes] of entries) {
    const filename = encoder.encode(name), sum = crc(bytes);
    const header = new Uint8Array(30 + filename.length), view = new DataView(header.buffer);
    view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
    view.setUint32(14, sum, true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true); view.setUint16(26, filename.length, true); header.set(filename, 30);
    const central = new Uint8Array(46 + filename.length), cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true);
    cv.setUint32(16, sum, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true); cv.setUint16(28, filename.length, true); cv.setUint32(42, offset, true); central.set(filename, 46);
    chunks.push(header, bytes); directory.push(central); offset += header.length + bytes.length; directorySize += central.length;
  }
  if (entries.size > 10000 || offset + directorySize + 22 > MAX_PACKAGE_BYTES) throw new Error("Package exceeds the 100 MB / 10,000-entry limit.");
  const end = new Uint8Array(22), ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.size, true); ev.setUint16(10, entries.size, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
  const result = new Uint8Array(offset + directorySize + end.length);
  let cursor = 0; for (const chunk of [...chunks, ...directory, end]) { result.set(chunk, cursor); cursor += chunk.length; }
  return result;
}
export function decodeZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  if (bytes.length < 22 || bytes.length > MAX_PACKAGE_BYTES) throw new Error("Invalid package size (maximum 100 MB).");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), end = bytes.length - 22;
  const fail = () => { throw new Error("Invalid ZIP. Use an unmodified LC Library export (STORE format)."); };
  if (view.getUint32(end, true) !== 0x06054b50 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true) || view.getUint16(end + 20, true)) fail();
  const count = view.getUint16(end + 10, true), start = view.getUint32(end + 16, true);
  if (count > 10000 || view.getUint16(end + 8, true) !== count || start + view.getUint32(end + 12, true) !== end) fail();
  const entries = new Map<string, Uint8Array>(); let cursor = start, localEnd = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || view.getUint32(cursor, true) !== 0x02014b50) fail();
    const length = view.getUint32(cursor + 24, true), nameLength = view.getUint16(cursor + 28, true), extra = view.getUint16(cursor + 30, true), comment = view.getUint16(cursor + 32, true), local = view.getUint32(cursor + 42, true);
    if (view.getUint16(cursor + 10, true) !== 0 || view.getUint16(cursor + 8, true) !== 0x800 || view.getUint32(cursor + 20, true) !== length || cursor + 46 + nameLength + extra + comment > end || local !== localEnd || local + 30 > start) fail();
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    if (!/^(manifest\.json|data\.json|assets\/[a-f0-9]{64}\.(png|jpg|webp|gif|avif))$/.test(name) || entries.has(name)) fail();
    const dataStart = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (view.getUint32(local, true) !== 0x04034b50 || view.getUint16(local + 8, true) !== 0 || view.getUint16(local + 6, true) !== 0x800 || dataStart + length > start || view.getUint32(local + 18, true) !== length || view.getUint32(local + 22, true) !== length || decoder.decode(bytes.subarray(local + 30, local + 30 + view.getUint16(local + 26, true))) !== name) fail();
    const content = bytes.slice(dataStart, dataStart + length);
    if (crc(content) !== view.getUint32(cursor + 16, true) || crc(content) !== view.getUint32(local + 14, true)) fail();
    entries.set(name, content); localEnd = dataStart + length; cursor += 46 + nameLength + extra + comment;
  }
  if (cursor !== end || localEnd !== start) fail();
  return entries;
}
