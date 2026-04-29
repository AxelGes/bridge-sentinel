export const MockOFTBridgeABI = [
  {
    type: "function",
    name: "getDVNConfig",
    inputs: [],
    outputs: [
      { name: "", type: "uint8" },
      { name: "", type: "address[]" },
    ],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "DVNConfigUpdated",
    inputs: [
      { name: "required", type: "uint8", indexed: false },
      { name: "dvns", type: "address[]", indexed: false },
    ],
  },
] as const;
