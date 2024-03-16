const packet = require("dns-packet");

// converting into dns wire format
export function hexEncodeName(name: string) {
  return "0x" + packet.name.encode(name).toString("hex");
}
