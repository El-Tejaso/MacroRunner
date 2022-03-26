const toRegexGlobal = (expr: string | RegExp) => {
    if (expr instanceof RegExp) {
        let flags = expr.flags;
        if (flags.indexOf("g") === -1) {
            flags += "g";
        }
        return new RegExp(expr, flags);
    } else {
        return new RegExp(expr, "g");
    }
};

export default class EditableFile {
    private text: string;
    private isDebug: boolean;
    intermediateStates: string[];

    constructor(text: string) {
        this.text = text;
        this.intermediateStates = new Array<string>();
        this.isDebug = false;
    }

    setText(newText: string) {
        if (this.isDebug) {
            this.markUndoPoint();
        }
        this.text = newText;
    }

    getText() {
        return this.text;
    }

    markUndoPoint() {
        this.intermediateStates.push(this.text);
    }

    matchNext(expr: RegExp | string, position: number = 0) {
        expr = toRegexGlobal(expr);

        // JS strings are immutable, so this shouldn't allocate anything at all. Right?
        const substr = this.text.substring(position);
        const matches = substr.matchAll(expr);
        for (const match of matches) {
            if (match && match.index !== undefined) {
                match.index += position;
            }

            return match;
        }

        return null;
    }

    replace(ranges: number[][], strings: string[]) {
        // check for overlapping ranges
        ranges = ranges.sort((a, b) => {
            return a[0] - b[0];
        });

        for (let i = 1; i < ranges.length; i++) {
            // check if previous range extends over current range. (inclusive, exclusive)
            if (ranges[i - 1][1] > ranges[i][0]) {
                throw new Error(
                    `Range ${i - 1} : ${ranges[i - 1]} overlaps with ${i} : ${ranges[i]}`
                );
            }
        }

        const stringBuilder: string[] = [];
        let previousIndex = 0;
        let currentDelta = 0;
        const newRanges = ranges.map((x) => [...x]);
        for (let i = 0; i < ranges.length; i++) {
            const [start, end] = ranges[i];
            stringBuilder.push(this.text.slice(previousIndex, start));
            stringBuilder.push(strings[i]);
            previousIndex = end;

            currentDelta += strings[i].length - (end - start);
            newRanges[i][0] += currentDelta;
            newRanges[i][1] += currentDelta;
        }
        stringBuilder.push(this.text.slice(previousIndex));

        this.text = stringBuilder.join("");
        return newRanges;
    }

    insert(positions: number[], strings: string[]) {
        return this.replace(
            positions.map((x) => [x, x]),
            strings
        );
    }

    remove(ranges: number[][]) {
        return this.replace(
            ranges,
            ranges.map((x) => "")
        );
    }

    indexAfter(str: string, position: number = 0) {
        const pos = this.text.indexOf(str, position);
        if (pos === -1) return -1;
        return pos + str.length;
    }

    private reverseStringCompare(str: string, pos: number = 0) {
        if (pos + 1 - str.length < 0) return false;

        for (let i = 0; i < str.length; i++) {
            if (this.text[pos - i] !== str[str.length - 1 - i]) {
                return false;
            }
        }

        return true;
    }

    lastIndexAfter(str: string, position: number = -1) {
        if (position < 0) {
            position = this.text.length + position;
        }

        if (str === "") return -1;

        for (let i = position; i >= 0 - 1; i--) {
            if (this.reverseStringCompare(str, i)) {
                return i + 1;
            }
        }

        return -1;
    }
}
