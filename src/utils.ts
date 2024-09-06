export class ComplexType {
    static includes<T>(value: T) {
        return Object.values(this).includes(value);
    }
}

export interface List<T> {
    set(key: string, value: T): List<T>;
    get(key: string): T | undefined;
    del(key: string): List<T>;
    has(key: string): boolean;
    forEach(callbackFunction: (key: string, value: T, list: { [key: string]: T }) => void): void;
}

export class List<T> {
    private readonly list: { [key: string]: T } = {};

    public set(key: string, value: T): List<T> {
        this.list[key] = value;
        if (!this.list[key]) throw new Error("Error setting member of a List");
        return this;
    }

    public get(key: string): T | undefined {
        return this.list[key];
    }

    public delete(key: string): List<T> {
        delete this.list[key];
        if (this.list[key]) throw new Error("Error deleting member of an List");
        return this;
    }

    public contains(key: string): boolean {
        return (this.list[key] !== undefined);
    }

    public forEach(callbackFunction: (key: string, value: T, list: { [key: string]: T }) => void): void {
        for (const key in this.list) {
            if (this.list.hasOwnProperty(key)) {
                callbackFunction(key, this.list[key], this.list);
            }
        }
    };

    public get length() {
        return Object.values(this.list).filter((val) => { return val !== undefined; }).length;
    }
}