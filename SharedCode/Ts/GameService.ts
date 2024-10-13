export const Bomb='M';
export const PlayersSymbol = ['X','O'];
import { EventEmitter } from 'eventemitter3';

interface GameMove {
    playerId: number;
    cellId: number;
    allCells: string[];
}
interface SaveGame {
    player1: string|null;
    player2: string|null;
    startingPlayer: number;
    winnerPlayer: number|null;
    board: string[];
    allMoves: GameMove[];
}
class BoardGenerator {
    public board: string[];
    public constructor() {
        this.board = Array(9).fill('');
    }
    protected getRandomInt (min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };  
    public GenerateBoard(): string[] {
        let cell = this.getRandomInt(0, 9);
        this.board[cell] = Bomb;
        this.startFloodFill(cell);
        return this.board;
    }      
    public floodFill(cellIndex: number, mIndex: number): void {
        if (cellIndex < 0 || cellIndex >= 9 || this.board[cellIndex] !== '') {
            return;
        }
        const [row, col] = [Math.floor(cellIndex / 3), cellIndex % 3];
        const [mRow, mCol] = [Math.floor(mIndex / 3), mIndex % 3];
        const distance = Math.abs(row - mRow) + Math.abs(col - mCol);
        this.board[cellIndex] = distance.toString();
        this.floodFill(cellIndex - 3, mIndex);
        this.floodFill(cellIndex + 3, mIndex);
        this.floodFill(cellIndex - 1, mIndex);
        this.floodFill(cellIndex + 1, mIndex);
    }
    public startFloodFill(mIndex:number): void {
        this.floodFill(mIndex - 3, mIndex);
        this.floodFill(mIndex + 3, mIndex);
        this.floodFill(mIndex - 1, mIndex);
        this.floodFill(mIndex + 1, mIndex);
    }
}
enum GameStatus {
    PlayerSelection,
    WaitingForPlayer,
    JoiningGame,
    StartingGame,
    Player1Turn,
    Player2Turn,
    Player1Win,
    Player2Win    
}
class GameRulesService extends EventEmitter {
    gameStatus: GameStatus = GameStatus.PlayerSelection;
    currentGame: SaveGame|null = null;
    boardGenerator : BoardGenerator = new BoardGenerator();
    public setGameStatus(status: GameStatus): void {
        if(this.gameStatus!=status) {
            this.gameStatus = status;
            this.emit('gameStatusChanged', status);
        }
    }
    public getLastMove(): GameMove | null {
        if(this.currentGame==null) {
            return null;
        }
        return this.currentGame.allMoves.length>0 ? this.currentGame.allMoves[this.currentGame.allMoves.length-1]:null;
    }
    public checkWin(move: GameMove): GameStatus | null {
        const board = this.currentGame?.board;
        if(board==null) {
            return null;
        }
        const allCells = move.allCells;
        const bombIndex = board.findIndex(cell => cell === Bomb);
        if (allCells[bombIndex] !== '') {
            return allCells[bombIndex] == PlayersSymbol[1] ? GameStatus.Player1Win : GameStatus.Player2Win;
        }
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (allCells[a] !== '' && allCells[a] === allCells[b] && allCells[a] === allCells[c]) {
                return allCells[a] === PlayersSymbol[0] ? GameStatus.Player1Win : GameStatus.Player2Win;
            }
        }
        return move.playerId == 0 ? GameStatus.Player2Turn : GameStatus.Player1Turn;
    }
    public createGame(player1:string|null, player2:string|null): SaveGame {
        const board = this.boardGenerator.GenerateBoard();
        const startingPlayer = Math.random() > 0.5 ? 1 : 0;
        const game:SaveGame = {
            player1: player1,
            player2: player2,
            winnerPlayer: null,
            startingPlayer: startingPlayer,
            board: board,
            allMoves: []
        };
        return game;
    }
    public gameLoaded(saveGame: SaveGame): void {
        this.currentGame = saveGame;
        if(saveGame.player2==null) {
            return;
        }
        if(saveGame.winnerPlayer!=null) {
            this.setGameStatus(saveGame.winnerPlayer==0 ? GameStatus.Player1Win : GameStatus.Player2Win);
            return;
        }
        const move = this.getLastMove();
        if(move!=null) {            
            const status = this.checkWin(move);
            if(status!=null) {
                this.setGameStatus(status);
                return;
            }
        }
        this.setGameStatus(saveGame.startingPlayer==0 ? GameStatus.Player1Turn : GameStatus.Player2Turn);
    }
    public canMove(palyerId:number, cellId: number): boolean {
        if(this.currentGame==null) {
            return false;
        }
        const allCells = this.getLastMove()?.allCells;
        if(allCells==null) {
            return this.currentGame.startingPlayer == palyerId;
        }
        const statusCheck = palyerId ==0 ? this.gameStatus==GameStatus.Player1Turn: this.gameStatus==GameStatus.Player2Turn;        
        return statusCheck && allCells!=null && allCells[cellId] === '';
    }
    public makeMove(playerId:number, cellId: number): SaveGame|null {
        if(this.canMove(playerId, cellId)) {
            const move = this.getLastMove();
            const newCells = move==null ? Array(9).fill('') : [...move.allCells];
            newCells[cellId] = PlayersSymbol[playerId];
            const newMove = {playerId, cellId, allCells: newCells};
            this.currentGame!.allMoves.push(newMove);
            const nextStatus = this.checkWin(newMove);
            if(nextStatus==GameStatus.Player1Win) {
                this.currentGame!.winnerPlayer = 0;
            }
            else if(nextStatus==GameStatus.Player2Win) {
                this.currentGame!.winnerPlayer = 1;
            }
        }
        return this.currentGame;
    }
}

import { useState, useEffect } from 'react';
import { userService } from './UserService';

export function useUserName() {
    const [userName, setUserName] = useState<string | null>(userService.userName());

    useEffect(() => {
        const handleuserNameChanged = (newUserName: string | null) => {
            setUserName(newUserName);
        };
        userService.on('userNameChanged', handleuserNameChanged);
        return () => {
            userService.off('userNameChanged', handleuserNameChanged);
        };
    }, []);

    return userName;
}