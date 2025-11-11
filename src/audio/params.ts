import { createEffect, createSignal, type Signal } from 'solid-js';

export class Parameter<T> {
    private _value: Signal<T>;
    protected _cleaner?: (v: T) => T;

    constructor(initial: T) {
        this._value = createSignal(initial);
    }
    get value(): T {
        return this._value[0]();
    }
    set value(v: T) {
        // @ts-expect-error - solid-js type inference is broken
        this._value[1](this._cleaner ? this._cleaner(v) : v);
    }
    onChange(fn: (v: T) => void) {
        // @ts-expect-error - solid-js type inference is broken
        createEffect(() => fn(this.value[0]()));
    }
}

export class UnitParam extends Parameter<number> {
    _cleaner = (v: number) => Math.min(Math.max(v, 0.0), 1.0);
}
export class PolarParam extends Parameter<number> {
    _cleaner = (v: number) => Math.min(Math.max(v, -1.0), 1.0);
}
export class PositiveParam extends Parameter<number> {
    _cleaner = (v: number) => Math.max(v, 0.0);
}

export type Range = [number, number];
export class RangeParam extends Parameter<Range> {
    _cleaner = (v: Range): Range => {
        if (typeof v === 'number') return [v, v];
        const small = Math.min(v[0], v[1]);
        const large = Math.max(v[0], v[1]);
        return [small, large];
    };
}
export class WaitParam extends RangeParam {
    _cleaner = (v: Range): Range => {
        if (typeof v === 'number') {
            const pos = Math.max(v, 0.0);
            return [pos, pos];
        }
        const small = Math.max(Math.min(v[0], v[1]), 0.0);
        const large = Math.max(Math.max(v[0], v[1]), 0.0);
        return [small, large];
    };
}

export type ParameterCollection = Record<string, Parameter<unknown>>;
export type ExtractParams<C extends ParameterCollection> = {
    [K in keyof C]: C[K] extends Parameter<infer T> ? T : never;
};
export type ParamsOf<T extends new (...args: any[]) => any> = ExtractParams<InstanceType<T>>;
export type Parameters = new (...args: any[]) => any;
