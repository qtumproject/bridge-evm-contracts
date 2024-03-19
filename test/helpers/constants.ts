export enum ERC20BridgingType {
  LiquidityPool,
  Wrapped,
  USDCType,
}

export enum ERC721BridgingType {
  LiquidityPool,
  Wrapped,
}

export enum ERC1155BridgingType {
  LiquidityPool,
  Wrapped,
}

export enum ProtectedFunction {
  None,
  Pause,
  Unpause,
  AddHash,
  BridgeUpgrade,
  SetPauseManager,
  SetSignersThreshold,
  AddSigners,
  RemoveSigners,
  ToggleSignersMode,
}
