const packet = require("dns-packet");
const SignedSet = require("@ensdomains/dnsprovejs").SignedSet;

// converting into dns wire format
export function hexEncodeName(name: string) {
  return "0x" + packet.name.encode(name).toString("hex");
}

export function getAnchor() {
  const anchor = {
    name: ".",
    type: "DS",
    class: "IN",
    ttl: 3600,
    data: {
      keyTag: 1278, // Empty body, flags == 0x0101, algorithm = 253, body = 0x0000
      algorithm: 253,
      digestType: 253,
      digest: Buffer.from("", "hex"),
    },
  };

  return "0x" + packet.answer.encode(anchor).toString("hex");
}

export function hexEncodeSignedSet(keys: any) {
  const ss = new SignedSet(keys.rrs, keys.sig);
  return [ss.toWire(), ss.signature.data.signature];
}

export function rootKeys(expiration: number, inception: number) {
  var name = ".";

  var sig = {
    name: ".",
    type: "RRSIG",
    ttl: 0,
    class: "IN",
    flush: false,
    data: {
      typeCovered: "DNSKEY",
      algorithm: 253,
      labels: 0,
      originalTTL: 3600,
      expiration,
      inception,
      keyTag: 1278,
      signersName: ".",
      signature: Buffer.from([]),
    },
  };

  var rrs = [
    {
      name: ".",
      type: "DNSKEY",
      class: "IN",
      ttl: 3600,
      data: { flags: 0, algorithm: 253, key: Buffer.from("0000", "hex") },
    },
    {
      name: ".",
      type: "DNSKEY",
      class: "IN",
      ttl: 3600,
      data: { flags: 0, algorithm: 253, key: Buffer.from("1112", "hex") },
    },
    {
      name: ".",
      type: "DNSKEY",
      class: "IN",
      ttl: 3600,
      data: {
        flags: 0x0101,
        algorithm: 253,
        key: Buffer.from("0000", "hex"),
      },
    },
  ];
  return { name, sig, rrs };
}

export const testRrset = (
  name: string,
  account: string,
  expiration: number,
  inception: number
) => ({
  name,
  sig: {
    name: "aseem",
    type: "RRSIG",
    ttl: 0,
    class: "IN",
    flush: false,
    data: {
      typeCovered: "TXT",
      algorithm: 253,
      labels: name.split(".").length + 1,
      originalTTL: 3600,
      expiration,
      inception,
      keyTag: 1278,
      signersName: ".",
      signature: Buffer.from([]),
    },
  },
  rrs: [
    {
      name: `_ens.${name}`,
      type: "TXT",
      class: "IN",
      ttl: 3600,
      data: Buffer.from(`a=${account}`, "ascii"),
    },
  ],
});
