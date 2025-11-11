import { createSignal, onCleanup } from 'solid-js';

/**
 * A listener is a function that is called when the value of a parameter changes.
 *
 * @template T - The type of the value.
 */
type Listener<T> = (value: T) => void;

/**
 * A parameter is a value that can be changed by the user. It is used to
 * configure the behavior of a processor or source. It is represented as a signal
 * that can be subscribed to for changes and allows for SolidJS reactivity.
 *
 * @template T - The type of the parameter.
 */
export class Parameter<T> {
    private _value: T;
    private listeners = new Set<Listener<T>>();
    private _cleaner?: (v: T) => T;

    constructor(initial: T, cleaner?: (v: T) => T) {
        this._value = initial;
        this._cleaner = cleaner;
    }

    get value() {
        return this._value;
    }
    set value(v: T) {
        const next = this._cleaner ? this._cleaner(v) : v;
        if (next === this._value) return;
        this._value = next;
        for (const fn of this.listeners) fn(next);
    }

    onChange(fn: Listener<T>) {
        this.listeners.add(fn);
    }
    off(fn: Listener<T>) {
        this.listeners.delete(fn);
    }
}

/**
 * A boolean parameter is a parameter that is a boolean.
 */
export class BoolParam extends Parameter<boolean> {
    constructor(initial: boolean) {
        super(initial);
    }
}

/**
 * A unit parameter is a parameter that is a number between 0 and 1.
 */
export class UnitParam extends Parameter<number> {
    constructor(initial: number) {
        super(initial, (v) => Math.min(Math.max(v, 0.0), 1.0));
    }
}
/**
 * A polar parameter is a parameter that is a number between -1 and 1.
 */
export class PolarParam extends Parameter<number> {
    constructor(initial: number) {
        super(initial, (v) => Math.min(Math.max(v, -1.0), 1.0));
    }
}
/**
 * A positive parameter is a parameter that is a number greater than 0.
 */
export class PositiveParam extends Parameter<number> {
    constructor(initial: number) {
        super(initial, (v) => Math.max(v, 0.0));
    }
}

/**
 * A range parameter is a parameter that is a tuple of two numbers representing a range.
 * The first number is the minimum value and the second number is the maximum value.
 * The first number must be less than or equal to the second number.
 */
export type Range = [number, number];

/**
 * A range parameter is a parameter that is a tuple of two numbers representing a range.
 * The first number is the minimum value and the second number is the maximum value.
 * The first number must be less than or equal to the second number.
 */
export class RangeParam extends Parameter<Range> {
    constructor(initial: Range) {
        super(initial, (v) => {
            if (typeof v === 'number') return [v, v];
            const small = Math.min(v[0], v[1]);
            const large = Math.max(v[0], v[1]);
            return [small, large];
        });
    }
}

/**
 * A wait parameter is an extension of the {@link RangeParam} that is used to represent a wait time,
 * because it is expected to contain seconds as the unit, it only allows for positive values.
 *
 * The first number is the minimum value and the second number is the maximum value.
 * The first number must be less than or equal to the second number.
 */
export class WaitParam extends RangeParam {
    constructor(initial: Range) {
        super(initial);
    }
}

/**
 * A string parameter is a parameter that is a string.
 */
export class StringParam extends Parameter<string> {
    constructor(initial: string) {
        super(initial);
    }
}

export type ParameterCollection = Record<string, Parameter<unknown>>;

/**
 * Utility type to extract the parameters of a class.
 *
 * @template C - The type of the class.
 */
export type ExtractParams<C extends ParameterCollection> = {
    [K in keyof C]: C[K] extends Parameter<infer T> ? T : never;
};

/**
 * Utility type to extract the parameters of a class.
 *
 * @template T - The type of the class.
 */
export type ParamsOf<T extends new (...args: any[]) => any> = ExtractParams<InstanceType<T>>;

/**
 * A parameters class is a class that contains a collection of parameters.
 * It is used to represent the parameters of a processor or source.
 *
 * @template T - The type of the parameters.
 */
export type Parameters = new (...args: any[]) => any;

/**
 * Serialize the parameters of a class into an object. This is a helper function
 * to serialize the parameters of a class into an object that can be serialized
 * to JSON.
 *
 * @template T - The type of the class.
 * @param params - The class to serialize the parameters of.
 * @returns An object containing the serialized parameters.
 */
export function serializeParams<T extends Parameters>(params: T): object {
    return Object.fromEntries(
        Object.entries(params.prototype)
            .filter(([_, v]) => v instanceof Parameter)
            .map(([k, v]) => [k, (v as Parameter<unknown>).value]),
    );
}

/**
 * Deserialize the parameters of a class from an object. This is a helper function
 * to deserialize the parameters of a class from an object that can be serialized
 * to JSON.
 *
 * @template T - The type of the class.
 * @param params - The class to deserialize the parameters of.
 * @param data - The object to deserialize the parameters from.
 */
export function deserializeParams<T extends Parameters>(params: T, data: object): void {
    Object.entries(data).forEach(([k, v]) => {
        const param = params.prototype[k as keyof typeof params.prototype];
        if (param instanceof Parameter) {
            param.value = v as unknown as typeof param.value;
        }
    });
}

/**
 * A hook to use a parameter in a SolidJS component.
 *
 * @template T - The type of the parameter.
 * @param param - The parameter to use.
 * @returns A tuple containing the current value of the parameter and a function to update the value.
 */
export function useParameter<T>(param: Parameter<T>) {
    const [value, setValue] = createSignal(param.value);

    const handler = (v: T) => setValue(() => v);
    param.onChange(handler);
    onCleanup(() => param.off(handler));

    const update = (v: T) => (param.value = v);

    return [value, update] as const;
}

export function useReadonlyParameter<T>(param: Parameter<T>) {
    const [value] = useParameter(param);
    return value;
}

/**
 * A hook to use a parameter in a SolidJS component that is polled at a given interval.
 * This is useful for values that are updated frequently, but may not be explicit
 * parameters and so we need a routine polling solution to constantly refresh the
 * value. Example would be a timeline value.
 *
 * @template T - The type of the parameter.
 * @param param - The parameter to use.
 * @param intervalMS - The interval in milliseconds to poll the parameter.
 * @returns A tuple containing the current value of the parameter and a function to update the value.
 */
export function usePollingParameter<T>(accessor: () => T, intervalMS: number = 100) {
    const [value, setValue] = createSignal(accessor());
    const interval = setInterval(() => {
        setValue(() => accessor());
    }, intervalMS);
    onCleanup(() => clearInterval(interval));
    return value;
}
