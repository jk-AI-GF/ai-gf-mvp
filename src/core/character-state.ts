// src/core/character-state.ts

import { ICharacterState } from '../module-api/module-context';

class CharacterState implements ICharacterState {
    private _curiosity: number = 0.5; // Default value, can be adjusted

    get curiosity(): number {
        return this._curiosity;
    }

    set curiosity(value: number) {
        this._curiosity = Math.max(0, Math.min(1, value)); // Ensure value is between 0 and 1
        // Potentially emit an event here if other parts of the system need to react to changes
    }
}

export const characterState = new CharacterState();
