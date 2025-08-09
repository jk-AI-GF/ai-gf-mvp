// src/core/character-state.ts

import { ICharacterState } from '../plugin-api/plugin-context';
import { AppEvents, TypedEventBus } from './event-bus';

class CharacterState implements ICharacterState {
    private _curiosity: number = 0.5;
    private _happiness: number = 0.5;
    private _energy: number = 0.8;
    private _lastInteractionTimestamp: number = Date.now();
    private eventBus: TypedEventBus<AppEvents> | null = null;

    public initialize(eventBus: TypedEventBus<AppEvents>) {
        this.eventBus = eventBus;
    }

    private emitChangeEvent() {
        this.eventBus?.emit('character-state:changed', this.toJSON());
    }

    get curiosity(): number {
        return this._curiosity;
    }

    set curiosity(value: number) {
        if (this._curiosity === value) return;
        this._curiosity = Math.max(0, Math.min(1, value));
        this.emitChangeEvent();
    }

    get happiness(): number {
        return this._happiness;
    }

    set happiness(value: number) {
        if (this._happiness === value) return;
        this._happiness = Math.max(0, Math.min(1, value));
        this.emitChangeEvent();
    }

    get energy(): number {
        return this._energy;
    }

    set energy(value: number) {
        if (this._energy === value) return;
        this._energy = Math.max(0, Math.min(1, value));
        this.emitChangeEvent();
    }

    get lastInteractionTimestamp(): number {
        return this._lastInteractionTimestamp;
    }

    set lastInteractionTimestamp(value: number) {
        if (this._lastInteractionTimestamp === value) return;
        this._lastInteractionTimestamp = value;
        this.emitChangeEvent();
    }

    /**
     * Hydrates the state from a saved object.
     * @param savedState The state object to load from.
     */
    public hydrate(savedState: Partial<ICharacterState>) {
        this._curiosity = savedState.curiosity ?? this._curiosity;
        this._happiness = savedState.happiness ?? this._happiness;
        this._energy = savedState.energy ?? this._energy;
        this._lastInteractionTimestamp = savedState.lastInteractionTimestamp ?? this._lastInteractionTimestamp;
        console.log('[CharacterState] State hydrated from saved data.');
    }

    /**
     * Returns a plain object representation of the state for serialization.
     */
    public toJSON(): ICharacterState {
        return {
            curiosity: this._curiosity,
            happiness: this._happiness,
            energy: this._energy,
            lastInteractionTimestamp: this._lastInteractionTimestamp,
        };
    }
}

export const characterState = new CharacterState();
