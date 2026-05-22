export type PlayerStatus =
  | 'active'
  | 'folded'
  | 'all-in'
  | 'busted'
  | 'sitting-out';

export type Phase =
  | 'lobby'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'hand-complete'
  | 'game-over';

export type ActionType =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'all-in'
  | 'post-sb'
  | 'post-bb';

export interface Player {
  id: string;
  name: string;
  stack: number;
  seat: number;
  status: PlayerStatus;
  currentBet: number;
  totalCommitted: number;
  hasActedThisRound: boolean;
  connected: boolean;
}

export interface PotShare {
  amount: number;
  eligiblePlayerIds: string[];
}

export interface Action {
  ts: number;
  playerId: string;
  playerName: string;
  type: ActionType;
  amount?: number;
}

export interface Hand {
  handNumber: number;
  phase: Phase;
  dealerSeat: number;
  smallBlindSeat: number;
  bigBlindSeat: number;
  currentTurnSeat: number;
  currentBetToCall: number;
  minRaise: number;
  pots: PotShare[];
  actions: Action[];
  awardedPotIndexes: number[];
}

export interface Game {
  code: string;
  hostId: string;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
  players: Player[];
  hand: Hand | null;
  history: Action[];
  createdAt: number;
  lastWinnings?: Array<{ playerId: string; amount: number }>;
}

export interface CreateGameInput {
  hostName: string;
  startingStack: number;
  smallBlind: number;
  bigBlind: number;
}
