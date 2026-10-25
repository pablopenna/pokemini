export type GameFlags = {
  canSurf: boolean;
  hasOldRod: boolean;
  hasGoodRod: boolean;
  hasSuperRod: boolean;
  canRockSmash: boolean;
};

export type GameFlag = keyof GameFlags;
