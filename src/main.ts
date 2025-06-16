import fs from "fs";
import path from "path";
import * as Zip from "./modules/Zip";
import Log from "./modules/Log";

(async () => {
    const inputFolderPath = "./input";
    const outputFolderPath = "./output";

    // 確認
    if (!fs.existsSync(inputFolderPath)) {
        fs.mkdirSync(inputFolderPath, { recursive: true });
        Log.info("inputフォルダーを生成しました");
    }

    if (!fs.existsSync(outputFolderPath)) {
        fs.mkdirSync(outputFolderPath, { recursive: true });
        Log.info("outputフォルダーを生成しました");
    }

    // outputフォルダーの中身をクリアする
    const files = fs.readdirSync(outputFolderPath, { recursive: true, withFileTypes: true });
    for (const file of files) {
        const filePath = path.join(outputFolderPath, file.name);

        try {
            fs.rmSync(filePath, { recursive: true });
        } catch { }
    }

    Log.info("outputフォルダー内をクリアしました");

    // 処理
    const dir = fs.readdirSync(inputFolderPath);

    Log.info(`${dir.length}個のファイルまたはフォルダーが見つかりました`);

    for (const file of dir) {
        const filePath = path.join(inputFolderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            Log.info(path.basename(filePath) + "の処理を開始します");

            const projectFolderPath = filePath;

            if (isServerFolder(filePath)) {
                await zip(projectFolderPath, outputFolderPath, ".mcworld");
                continue;
            }

            const manifestPaths = getManifestPaths(projectFolderPath);

            if (manifestPaths.length === 0) continue;
            if (manifestPaths.length === 1) {
                await zip(projectFolderPath, outputFolderPath, ".mcpack");
                continue;
            } else {
                await zip(projectFolderPath, outputFolderPath, ".mcaddon");
                continue;
            }
        }
    }

    Log.info("全ての処理が完了しました");
})();

/**
 * @param {string} folderPath
 * @returns {string[]}
 */
function getManifestPaths(folderPath: string): string[] {
    let manifestPaths: string[] = [];

    const dir = fs.readdirSync(folderPath);

    for (const file of dir) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            manifestPaths = manifestPaths.concat(getManifestPaths(filePath));
        } else if (stats.isFile() && file === "manifest.json") {
            manifestPaths.push(filePath);
        }
    }

    return manifestPaths;
}

function isServerFolder(folderPath: string): boolean {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
        return false;
    }

    const dirEntries = fs.readdirSync(folderPath);
    const checks: Record<string, boolean> = {
        "level.dat": false,
        "db": false,
    };

    for (const file of dirEntries) {
        const filePath = path.join(folderPath, file);
        const name = path.basename(filePath);

        if (name in checks) {
            checks[name] = true;
        }
    }

    return Object.values(checks).every(v => v);
}

/**
 * 指定されたフォルダーをzipにします
 * @param {string} directoryPath
 * @param {string} outputPath 
 * @param {string} extension
 */
async function zip(directoryPath: string, outputPath: string, extension: string) {
    try {
        const outputFolderPath = path.join(outputPath, path.basename(directoryPath) + extension);

        await Zip.compress([directoryPath], outputFolderPath, { showProgressBar: true });
    } catch (e) {
        console.error(e);
    }
}