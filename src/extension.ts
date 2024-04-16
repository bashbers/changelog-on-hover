// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export interface changelogData {
    string: string;
    path: vscode.Uri;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "changelog-on-hover" is now active!');

    vscode.languages.registerHoverProvider(
        { pattern: '**/package.json' },
        {
            async provideHover(document, position) {
                const config = vscode.workspace.getConfiguration('changelogOnHover');
                const amountOfLines = config.get('amountOfLines');
                const buttonText = config.get('buttonText');
                try {
                    const packagePath = determinePackagePath(document, position);
                    const data = await readChangelogToString(packagePath);

                    if (data.string) {
                        let nLines = new RegExp(`(.*?\n){${amountOfLines}}`).exec(data.string)?.[0] ?? data.string;
                        let markdown = new vscode.MarkdownString(nLines);
                        markdown.appendMarkdown(`\n\n<h3><a href="${data.path}">${buttonText}</a></h3>\n\n`);
                        markdown.supportHtml = true;

                        return new vscode.Hover(markdown);
                    }
                } catch (e: any) {
                    console.error(e.message);
                    return;
                }
            }
        }
    );
}

// This method is called when your extension is deactivated
export function deactivate() {}

export function determinePackagePath(document: vscode.TextDocument, position: vscode.Position) {
    const lineText = document.lineAt(position.line).text;
    const packageName = lineText
        .match(/"[a-zA-Z-@\/]+"/)
        ?.toString()
        .replaceAll('"', '');

    const currentFilePath = vscode.window.activeTextEditor?.document.uri.fsPath.split('package.json')[0];

    if (packageName && currentFilePath) {
        const fullPath = `${currentFilePath}node_modules/${packageName}/`;
        return vscode.Uri.parse(fullPath);
    }

    throw new Error('Cant determine packagename or currentfilepath.');
}

export async function readChangelogToString(path: vscode.Uri): Promise<changelogData> {
    const changelogOptions = vscode.workspace.getConfiguration('changelogOnHover').get('changelogOptions') as string[];

    // console.log(path);
    for (let i = 0; i < changelogOptions.length; i++) {
        const option = changelogOptions[i];
        const pathToCheck = path.with({ path: path.path + option });
        try {
            const readstr = await vscode.workspace.fs.readFile(pathToCheck);
            return { string: Buffer.from(readstr).toString('utf8'), path: pathToCheck };
        } catch {
            continue;
        }
    }
    throw new Error(`Couldn't find a changelog.md file.`);
}
