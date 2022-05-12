
# Macro Runner
This extension provides a quick and simple way to process a text file with some quickly written Javascript. The API is far simpler than VSCode's edit builder API.

Use the `New Macro` command from the `Ctrl+Shift+P` menu to create a new macro. The default macro template will open in a text editor to the side of whatever you're editing. 

Then, write your macro. For example, here is a macro that will remove duplicate lines in a text file - something that I actually use every now and then:

```javascript
// macro: deduplicate lines

const file = context.getFile();
let text = file.text;

if (text[text.length - 1] !== "\n") {
    text += "\n";
}
// let's say you wrote this real quick and didn't care for readability
text = [...new Set(text.split("\n"))].join("\n");

file.setText(text);
```

(You won't have any autocomplete, but the API is fairly small and easy to remember. You can find the documentation if you keep scrolling, but the examples in the `examples` folder should explain most things. (Also if you happen to know an easy way I could add autocomplete, feel free to let me know))

Run it with the `Run macro` command. This will only work if you have the editor with the macro code and the editor with the target text visible at the same time. 

You don't have to save your macro anywhere to be able to run it, but you can if you want to with the `Save macro` command. This allows you to load it later with the `Load macro` command. The `Delete macro` and `Open macros directory` commands also exist for macro management. 

You will notice that the `Load Macro` command simply opens a macro you saved to the side of whatever you're editing. But a lot of the time, you will want to run a macro without having to call `Load Macro` and `Run Macro` and all the other stuff associated with that. You can use the `Run Saved Macro` command to run something that you have already saved.

## Limitations

The `Run Macro` command won't work for files larger than 50mb. At the moment, all VSCode extensions are [unable to interact with files > 50mb in size](https://github.com/microsoft/vscode/issues/31078), so the extension will fail at the step where it is trying to find the document you have open. You will instead have to use the `Run Macro (For large files > 50mb)` command. This is identical to the `Run Macro` command, but you will manually specify a file, and then rather than editing the file itself, it will bring the result into a new untitled document.

# Other use cases

Sometimes you may want to do a bunch of processing on a document, and then output those results to a new document. You can do something like this:

```javascript
const file = context.getFile();

// do some processing on the file
const result = someProcessingOnTheFile(file.text);

const output = context.newFile();
output.setText(result);
```

This will create a new file with `result` as it's contents.

It is also possible to make changes to a document based on the current cursor positions or selections, and to set new cursor positions/selections.

Some basic text based animation is also supported, although not the main focus. Take a look at the `GOL.js` examples in the `examples` folder, and then read the documentation on `context.outputImmediate` and `loop` to understand how it works under the hood.

# Features I won't add:
I won't be adding any feature that causes the API to become more complicated than it already is. 
For instance, utility functions that wrap vscode's filesystem API to access and write to any workspace file would necessarily need to be `async`, and I don't particularly like writing `await` in front of every single function when to avoid any bugs that I would get from forgetting an `await` (but if you really wanted to do something like this, checkout the `projectDirectory` example in the examples folder).


# Possible additional features

So it turns out that I am using this extension a lot more than even I thought I would. There are a few things that I now need to add:

- Some way to create an output and log it somewhere. We can output text to a new file, but I would like to be able to output to the same file over and over
- Some way to do debug logging. the vscode error messages aren't enough. Probably to a file that persists in global storage

# Known issues

Stack-overflow exceptions will be silently ignored, and will cause the edtior to crash. E.g something like this may frustrate you to no end till you notice the typo and kick yourself:
```javascript
const stringBuilder = []

for(let i = 0; i = file.text.length; i++) {
    stringBuilder.push(String.fromCharCode(file.text.charCodeAt(i) + cipherOffset));
}
```


# API Documentation / details

One problem with this approach to macros is that even though you will be writing far less code that is far simpler, you won't get any autocomplete for injected objects, so I have to write a bunch of documentation (sigh). There may be functions that I omit due to them being too insignificant.

## Injected objects?

Your macro is ran by using a `Function()` JavaScript object (not easy to find docs on this unless you are looking for documentation on [`eval()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!)).
You can see what this call looks like for yourself `runmacroCommand.ts`, if that's your thing, and you will notice that some objects are being injected into it.

For those of you who didn't peer at the source code, think of it as basically looking something like this:

```javascript
const runmacro = (context, debug, ...injectedObjects) => {
    // your macro code is copy-pasted here, and has access to all the injected objects above
}
```
Except that it won't have access to global scope, because it is wrapped in a string and then compiled with a <code l='JavaScript'>Function()</code> object.

[//]: # "Anchor point"

    
## context : MacroContext
You will be using this object to edit the target file, and possibly create new output files.



### context.rootDir:string

> Use this to get the project root fsPath. This will fallback to the document's folder if no folder is open, and then fallback to being `undefined` if the macro is being run on an untitled file.



### context.getFile(index?=0) -> EditableFile

> Use `getFile()` to get the currently active file as an `EditableFile` object. 
The index is zero by default, which points to the target file. 
An index greater than 0 can be provided to access files that were newly created with `newFile`.



### context.newFile(text="") -> EditableFile

> Use `newFile()` to create a new output file as an `EditableObject` object. 
Text can be provided to set it's initial text.



### async context.outputImmediate(index=0)

> Use `outputImmediate()` to push the current text in a file directly to the target file immediately.
This has no real use other than novelty, in that it can be used along with `setInterval`/`loop` to make animations.
There was no real reason for me to add this, or the interval method overrides, I just did it for fun.
See the GOL example to see how to use



Possible additions: 

- Some way to open files in the workspace by name/glob and make changes to them

    
## file : EditableFile
This is the object that you will use to interface between the macro and a text file in Visual Studio.. 
Note that you aren't editing the actual text file, rather, you
are making changes to a normal javascript object, and the extension will see those changes and make them in the real document after the
macro is ran.



### file.text : string

> The text in this file. Make changes to this in your macro. 
Optionally use `setText` instead of `file.text=whatever`, which will throw an exception
if you are passing in something that isn't a string.



### file.selectedRanges : [rangeStart: number, rangeEnd: number][]

> The current ranges in the document that are selected. 
Each number is a number index into the string.
Changes to this array will be reflected in the document after the macro has finished running.
If rangeStart and rangeEnd are both the same, you will have a cursor without anything selected. 
If the range object is null, it will be ignored.



### file.setText(newText:string)

> Same as `file.text = newText`, but will throw an exception if the object you're passing isn't a `typeof 'string'` or `instanceof String`.
The other functions don't do this kind of type checking, I can't be bothered adding it.



### file.markUndoPoint()

> Save the value of file.text as an 'undo point'. 
The extension will then replay all of these undo points onto the target document before the final output, 
so that you can undo/redo between them - possibly for debugging purposes. 



Possible additions: 

- `matchPrev(regExp)`. But making this efficient seems hard. Any PRers?

    
## debug : DebugContext
This object is used to log things.



### async debug.info(message)

> Pushes an info message notification in VS-Code



### async debug.error(message)

> Pushes an error message notification in VS-Code



Possible additions: 

- Some way to log to a console of some sort. 
I don't care to implement this for now because I can print text straight to the document, or use other debugging techniques
- Breakpoints. 
They would be awesome, but I have no idea how to add them. It may require a massive rewrite.
Any PRers?

    
## ...stringUtils
These are utility methods that make string editing much easier.



### replaceMany(text:string, ranges: [number, number][], strings: string[]) -> [newText: string, new ranges: [number, number][]]

> Replaces all specified ranges in the text with the corresponding string. Modulo will be used to loop through strings if fewer strings than ranges are provided.  It then returns all the new range positions. 
Overlapping ranges will throw an exception. 
The ranges will also be returned in sorted order based on their starting point, as this is a side-effect of checking for overlapping ranges



### removeMany(text:string, ranges: [number, number][]) -> [newText: string, new ranges: [number, number][]]

> Short for `replaceMany(ranges, [""])`



### insertMany(text:string, positions: [number][], strings: string[]) -> [newText: string, new ranges: [number, number][]]

> Short for `replaceMany(positions.map(x => [x,x]), strings)`



### findAll(text:string, expr: RegExp | string) -> RegExpMatchArray[]

> Short for `Array.from(file.getText.matchAll(expr))`



### findAllPositions(text:string, expr: RegExp | string) -> number[]

> Same as findAll but collects all match indices



### findAllRanges(text:string, expr: RegExp | string) -> [number, number][]

> Same as matchAllArray but collects all ranges.  A range is defined as a tuple [start: number,end: number] 
where start is the start of the match (inclusive) and end is the end of a match (exclusive, 1 after the end of a match).



### matchNext(text:string, expr: RegExp | string, position: number = 0) -> RegExpMatchArray

> Same as JavaScript's string.indexOf, but you can use regex



### replace(text:string, str: string, start: number, end: number)

> Short for `file.text.substring(0, start) + str + file.text.substring(end)`



### insert(text:string, str: string, position: number)

> Short for `replace(str, position, position)`



### remove(text:string, start: number, end: number)

> Short for `replace('', start, end);`



### indexAfter(text:string, str: string, position: number = 0)

> Short for `text.indexOf(str, position) + str.length;`



### lastIndexAfter(text:string, str: string, position: number = -1)

> Same as indexOf but in the reverse direction, and 1 index after the string to remain consistent with indexAfter



Possible additions: 

- Low priority - Keyboard input. 
Any PRers ?

    
## ...javascriptUtils
These are normal javascript methods that have been directly injected, or overridden:



### require() -> module

> JavaScript's require function, untouched. Use it to require whatever modules you need



### async input(prompt: string) -> Promise<string>

> Provides a way to input arguments to your macros. You will need to use `await` with this method. 
This method will throw an exception if the input is canceled, and prevent the rest of the macro from running. 
If you don't want this behaviour, put it in a try-catch.



### SetInterval(callback, milliseconds) -> NodeJS.Timeout, SetTimeout(callback, milliseconds) -> NodeJS.Timeout, ClearInterval(timeout: NodeJS.Timeout), ClearTimeout(timeout: NodeJS.Timeout),

> These are actually wrappers for the normal javascript methods that interop better with this extension.
It behaves exactly the same as the javascript method.



### loop(callback(count) -> bool, milliseconds, loopCount=undefined|number)

> A wrapper for the setInterval method that allows for a loop counter, and accepts a callback  
that can return `true` to break out of the loop and anything else to keep looping 



Possible additions: 

- Low priority - Keyboard input. 
Any PRers ?

