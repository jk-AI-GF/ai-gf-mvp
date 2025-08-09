// src/core/character-state.ts

import { ICharacterState } from '../plugin-api/plugin-context';

class CharacterState implements ICharacterState {
    private _curiosity: number = 0.5; // Default value, can be adjusted
    private _happiness: number = 0.5;
    private _energy: number = 0.8; // Start with a bit more energy
    private _lastInteractionTimestamp: number = Date.now();

    get curiosity(): number {
        return this._curiosity;
    }

    set curiosity(value: number) {
        this._curiosity = Math.max(0, Math.min(1, value)); // Ensure value is between 0 and 1
        // Potentially emit an event here if other parts of the system need to react to changes
    }

    get happiness(): number {
        return this._happiness;
    }

    set happiness(value: number) {
        this._happiness = Math.max(0, Math.min(1, value));
    }

    get energy(): number {
        return this._energy;
    }

    set energy(value: number) {
        this._energy = Math.max(0, Math.min(1, value));
    }

    get lastInteractionTimestamp(): number {
        return this._lastInteractionTimestamp;
    }

    set lastInteractionTimestamp(value: number) {
        this._lastInteractionTimestamp = value;
    }
}

export const characterState = new CharacterState();
