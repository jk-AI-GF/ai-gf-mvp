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

    private setProperty(property: keyof Omit<ICharacterState, 'lastInteractionTimestamp' | 'toJSON' | 'hydrate' | 'initialize'>, value: number) {
        const privateKey = `_${property}` as keyof this;
        if (typeof this[privateKey] !== 'number' || this[privateKey] === value) return;
        
        const oldValue = this[privateKey] as number;
        (this as any)[privateKey] = Math.max(0, Math.min(1, value));
        const newValue = this[privateKey] as number;

        this.eventBus?.emit('character-state:propertyChanged', { property, newValue, oldValue });
        this.emitChangeEvent();
    }

    get curiosity(): number {
        return this._curiosity;
    }

    set curiosity(value: number) {
        this.setProperty('curiosity', value);
    }

    get happiness(): number {
        return this._happiness;
    }

    set happiness(value: number) {
        this.setProperty('happiness', value);
    }

    get energy(): number {
        return this._energy;
    }

    set energy(value: number) {
        this.setProperty('energy', value);
    }

    get lastInteractionTimestamp(): number {
        return this._lastInteractionTimestamp;
    }

    set lastInteractionTimestamp(value: number) {
        if (this._lastInteractionTimestamp === value) return;
        const oldValue = this._lastInteractionTimestamp;
        this._lastInteractionTimestamp = value;
        this.eventBus?.emit('character-state:propertyChanged', { property: 'lastInteractionTimestamp', newValue: value, oldValue });
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
