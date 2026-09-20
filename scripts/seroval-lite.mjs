/**
 * Minimal seroval-JSON decoder for the plain-data payloads returned by the
 * playground server function (numbers, strings, constants, arrays, objects).
 * The full seroval fromJSON rejects this site's payloads in Node, so we
 * decode the handful of node types that actually occur.
 */
const CONSTANTS = { 0: null, 1: undefined, 2: true, 3: false, 4: -0, 5: Infinity, 6: -Infinity, 7: NaN };

export function decodeSeroval(root) {
  const refs = new Map();
  function decode(node) {
    if (node == null || typeof node !== "object" || !("t" in node)) {
      throw new Error(`unexpected node: ${JSON.stringify(node)}`);
    }
    switch (node.t) {
      case 0: return Number(node.s);
      case 1: return String(node.s);
      case 2: return CONSTANTS[node.s];
      case 4: return refs.get(node.i);
      case 9: {
        const arr = [];
        if (node.i != null) refs.set(node.i, arr);
        for (const item of node.a) arr.push(decode(item));
        return arr;
      }
      case 10:
      case 11: {
        const obj = {};
        if (node.i != null) refs.set(node.i, obj);
        const keys = node.p.k;
        const values = node.p.v;
        for (let i = 0; i < keys.length; i++) obj[keys[i]] = decode(values[i]);
        return obj;
      }
      default:
        throw new Error(`unsupported seroval node type ${node.t}`);
    }
  }
  return decode(root);
}
