import type { Interface as ReadLine } from 'readline';
import { EventEmitter } from 'events';
import { ComplexType, List } from './utils.js';

interface CLIElementOptions {
    height?: number | string;
    width?: number | string;
    fullscreen?: boolean;
}

interface CLIInputOptions extends CLIElementOptions {
    prompt?: string;
}

interface CLIElement extends CLIEventEmitter {
    render(): string | void;
    finally(): void;
}

interface CLIContainerElement extends CLIElement {
    add(box: CLIElement, index?: number): CLIContainer;
    remove(index: number): CLIContainer;
    replace(box: CLIElement, index: number): CLIContainer;
}

class CLIEvents extends ComplexType {
    public static readonly RELOAD = 'reload';
}

export class CLI {
    private readonly windows = new List<CLIElement>();
    private currentWindow: string = '';

    constructor(startWindow?: CLIWindow) {
        if (startWindow) this.add(startWindow);
    }

    public static readonly cursor = class Cursor {
        static hide() { process.stdout.write('\x1B[?25l'); }
        static show() { process.stdout.write('\x1B[?25h'); }
    }

    public static readonly size = class Size {
        static get width() { return process.stdout.columns; }
        static get height() { return process.stdout.rows; }
    }

    add(newWindow: CLIWindow): CLI {
        this.windows.set(newWindow.name, newWindow);
        if (!this.currentWindow) this.currentWindow = newWindow.name;
        return this;
    }

    goto(name: string) {
        if (!this.windows.get(name)) throw new Error("Redirecting to non defined window");
        this.currentWindow = name;
        this.render();
    }

    render(): void {
        this.windows.get(this.currentWindow)?.render();
    }

}

class CLIEventEmitter extends EventEmitter {
    reload(): void {
        this.emit(CLIEvents.RELOAD);
    }
}

export class CLIWindow extends CLIEventEmitter implements CLIContainerElement {
    name: string;
    private mainContainer: CLIContainer;
    add;
    remove;
    replace;

    constructor(name: string, boxes?: CLIElement | CLIElement[]) {
        super();
        this.name = name;
        this.mainContainer = new CLIContainer(boxes);
        this.add = this.mainContainer.add;
        this.remove = this.mainContainer.remove;
        this.replace = this.mainContainer.replace;
        this.mainContainer.on(CLIEvents.RELOAD, () => { this.render(); });
    }

    render(): void {
        console.clear();
        CLI.cursor.hide();
        console.log(this.mainContainer.render());
    }

    finally() { };

}

export class CLIContainer extends CLIEventEmitter implements CLIContainerElement {
    protected elements: CLIElement[];

    constructor(boxes?: CLIElement | CLIElement[]) {
        super();
        this.elements = (boxes) ? ((!Array.isArray(boxes)) ? [boxes] : boxes) : [];
        this.elements.forEach((element) => {
            element.on(CLIEvents.RELOAD, () => { this.emit(CLIEvents.RELOAD); })
        });
    }

    add(box: CLIElement, index = -1): CLIContainer {
        this.elements.splice(index, 0, box);
        return this;
    }

    remove(index: number): CLIContainer {
        this.elements.splice(index, 1);
        return this;
    }

    replace(box: CLIElement, index: number): CLIContainer {
        this.elements.splice(index, 1, box);
        return this;
    }

    finally() { };

    render(): string {
        let string = '';

        this.elements.forEach((element) => {
            const str = element.render();
            string += (str) ? str : '';
        });

        return string;
    }

}

export class CLIText extends CLIEventEmitter implements CLIElement {
    public text: string;

    constructor(text: string) {
        super();
        this.text = text;
    }

    render(): string {
        return `${this.text}\n`;
    }

    finally(): void { }
}

interface CLICallbackElement extends CLIElement {
    callbackFunction(): void;
}
class CLICallbackElement extends CLIEventEmitter {
    protected size: { height: number, width: number };

    constructor(options?: CLIElementOptions) {
        super();

        function getSize(size: number | string): number {
            if (typeof size === 'string') {
                return CLI.size.height;
            }
            return size;
        }

        this.size = {
            height: (options && options.height) ? getSize(options.height) : -1,
            width: (options && options.width) ? getSize(options.width) : CLI.size.width
        }
    }
}

export interface CLIInputBox extends CLICallbackElement {
    callbackFunction(line?: string): void;
}
export class CLIInputBox extends CLICallbackElement {
    protected readonly readline: ReadLine;
    private handler = false;

    constructor(readline: ReadLine, callbackFunction: (line?: string) => void, options?: CLIInputOptions) {
        super(options);
        this.readline = readline;
        this.prompt = (options && options.prompt) ? options.prompt : '> ';
        this.callbackFunction = callbackFunction;
    }

    render(): void {
        if (!this.handler) {
            this.readline.on('line', this.callbackFunction);
            this.handler = true;
        }
        setImmediate(() => {
            CLI.cursor.show();
            this.readline.prompt(true);
        });
    }

    finally(): void {
        this.readline.off('line', this.callbackFunction);
    }

    get prompt(): string {
        return this.readline.getPrompt();
    }

    set prompt(value: string) {
        this.readline.setPrompt(value);
    }

}

export class CLIQuestionBox extends CLIInputBox {
    constructor(readline: ReadLine, question: string, callbackFunction: (line?: string) => void) {
        super(readline, callbackFunction, { prompt: question });
    }
}

interface Key {
    name?: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    sequence?: string;
}

interface MatrixIndex {
    row: number,
    column: number
}

export interface CLIChoiceBox extends CLICallbackElement {
    callbackFunction(index?: MatrixIndex): void;
}
export class CLIChoiceBox extends CLICallbackElement {
    private menuOptions: string[][];
    private currentIndex: MatrixIndex = { row: 0, column: 0 };
    private handler = false;

    constructor(menuOptions: (string | string[])[], callbackFunction: (index?: MatrixIndex) => void) {
        super();
        this.menuOptions = [];
        menuOptions.forEach((element, index) => {
            if (!Array.isArray(element)) this.menuOptions[index] = [element];
            else this.menuOptions[index] = element;
        });
        this.callbackFunction = callbackFunction;

        this.on('keypress', (char: string, key: Key) => {
            console.log(this.currentIndex);

        })
    }

    render(): string {
        if (!this.handler) {
            process.stdin.on('keypress', this.handleKeyPress);
            this.handler = true;
        }
        let string = ''
        this.menuOptions.forEach((row, rowIndex) => {
            row.forEach((column, columnIndex) => {
                if (rowIndex === this.currentIndex.row && columnIndex === this.currentIndex.column) {
                    string += `> ${column}\t\t`;
                } else {
                    string += `  ${column}\t\t`;
                }
            });
            string += '\n';
        });
        return string;
    }

    finally(): void {
        process.stdin.off('keypress', this.handleKeyPress);
    }

    handleKeyPress = (char: string, key: Key) => {
        switch (key.name) {
            case 'up':
                this.currentIndex.row = (this.currentIndex.row - 1 + this.menuOptions.length) % this.menuOptions.length;
                break;
            case 'down':
                this.currentIndex.row = (this.currentIndex.row + 1) % this.menuOptions.length;
                break;
            case 'left':
                this.currentIndex.column = (this.currentIndex.column - 1 + this.menuOptions[this.currentIndex.row].length) % this.menuOptions[this.currentIndex.row].length;
                break;
            case 'right':
                this.currentIndex.column = (this.currentIndex.column + 1) % this.menuOptions[this.currentIndex.row].length;
                break;
            case 'return':
                this.callbackFunction(this.currentIndex);
                return;
        }
        this.reload();
    }

}